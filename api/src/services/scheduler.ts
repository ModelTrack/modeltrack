import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/init";
import { sendAlert, sendBudgetWarning, sendDailySummary, sendWeeklySummary, sendScheduledReport } from "./slack";
import { generateExecutiveReport } from "../routes/reports";
import type { Alert } from "../models/types";
import type { DailySummary, WeeklySummary } from "./slack";

// Track which alerts have been sent: Set of "team:hour" keys
const sentAlerts = new Set<string>();
let lastClearDay: string = "";

let anomalyInterval: ReturnType<typeof setInterval> | null = null;
let dailySummaryTimeout: ReturnType<typeof setTimeout> | null = null;
let weeklySummaryTimeout: ReturnType<typeof setTimeout> | null = null;
let reportScheduleInterval: ReturnType<typeof setInterval> | null = null;

interface ReportScheduleRow {
  id: string;
  name: string;
  period: string;
  frequency: string;
  day_of_week: number;
  day_of_month: number;
  hour: number;
  delivery: string;
  enabled: number;
  created_at: string;
  last_sent_at: string | null;
}

let cachedSchedules: ReportScheduleRow[] = [];
let lastScheduleLoad = 0;

function clearSentAlertsDaily(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastClearDay) {
    sentAlerts.clear();
    lastClearDay = today;
    console.log("[Scheduler] Cleared sent alerts tracking for new day.");
  }
}

async function checkAnomalies(): Promise<void> {
  clearSentAlertsDaily();

  try {
    const db = getDatabase();

    const rows = db.prepare(`
      WITH hourly AS (
        SELECT
          strftime('%Y-%m-%dT%H:00:00Z', timestamp) AS hour,
          team,
          SUM(cost_usd) AS hourly_spend
        FROM cost_events
        GROUP BY strftime('%Y-%m-%dT%H:00:00Z', timestamp), team
      ),
      avg_hourly AS (
        SELECT
          team,
          AVG(hourly_spend) AS avg_spend
        FROM hourly
        GROUP BY team
      )
      SELECT
        h.hour,
        h.team,
        h.hourly_spend,
        a.avg_spend
      FROM hourly h
      JOIN avg_hourly a ON h.team = a.team
      WHERE h.hourly_spend > 2 * a.avg_spend
        AND a.avg_spend > 0
        AND h.hour >= strftime('%Y-%m-%dT%H:00:00Z', datetime('now', '-1 hour'))
      ORDER BY h.hour DESC
      LIMIT 50
    `).all() as Array<{ hour: string; team: string; hourly_spend: number; avg_spend: number }>;

    for (const r of rows) {
      const alertKey = `${r.team}:${r.hour}`;
      if (sentAlerts.has(alertKey)) {
        continue;
      }

      const alert: Alert = {
        id: uuidv4(),
        type: "anomaly",
        message: `Team "${r.team}" spent $${r.hourly_spend.toFixed(4)} in hour ${r.hour}, which is ${(r.hourly_spend / r.avg_spend).toFixed(1)}x the average ($${r.avg_spend.toFixed(4)})`,
        team: r.team,
        hour: r.hour,
        hourly_spend: r.hourly_spend,
        avg_spend: r.avg_spend,
        created_at: new Date().toISOString(),
      };

      const sent = await sendAlert(alert);
      if (sent) {
        sentAlerts.add(alertKey);
        console.log(`[Scheduler] Sent anomaly alert for ${alertKey}`);
      }
    }

    // Check budget warnings
    await checkBudgets();
  } catch (err) {
    console.error("[Scheduler] Anomaly check failed:", err);
  }
}

async function checkBudgets(): Promise<void> {
  try {
    const db = getDatabase();

    const budgets = db.prepare(`SELECT * FROM budgets`).all() as Array<{
      id: string;
      team: string;
      app_id: string;
      daily_limit_usd: number;
      monthly_limit_usd: number;
    }>;

    for (const budget of budgets) {
      // Check daily limit
      if (budget.daily_limit_usd > 0) {
        const row = db.prepare(`
          SELECT COALESCE(SUM(cost_usd), 0) AS spend
          FROM cost_events
          WHERE timestamp >= date('now', 'start of day')
            AND (? = '' OR team = ?)
            AND (? = '' OR app_id = ?)
        `).get(budget.team, budget.team, budget.app_id, budget.app_id) as { spend: number };

        const percentage = (row.spend / budget.daily_limit_usd) * 100;
        if (percentage >= 80) {
          await sendBudgetWarning(
            budget.team,
            budget.app_id,
            row.spend,
            budget.daily_limit_usd,
            percentage
          );
        }
      }

      // Check monthly limit
      if (budget.monthly_limit_usd > 0) {
        const row = db.prepare(`
          SELECT COALESCE(SUM(cost_usd), 0) AS spend
          FROM cost_events
          WHERE timestamp >= date('now', 'start of month')
            AND (? = '' OR team = ?)
            AND (? = '' OR app_id = ?)
        `).get(budget.team, budget.team, budget.app_id, budget.app_id) as { spend: number };

        const percentage = (row.spend / budget.monthly_limit_usd) * 100;
        if (percentage >= 80) {
          await sendBudgetWarning(
            budget.team,
            budget.app_id,
            row.spend,
            budget.monthly_limit_usd,
            percentage
          );
        }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Budget check failed:", err);
  }
}

async function generateAndSendDailySummary(): Promise<void> {
  try {
    const db = getDatabase();

    const todaySpend = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) AS total_spend,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE timestamp >= date('now', 'start of day')
    `).get() as { total_spend: number; request_count: number };

    const yesterdaySpend = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) AS total_spend
      FROM cost_events
      WHERE timestamp >= date('now', '-1 day', 'start of day')
        AND timestamp < date('now', 'start of day')
    `).get() as { total_spend: number };

    const topModel = db.prepare(`
      SELECT model, SUM(cost_usd) AS spend
      FROM cost_events
      WHERE timestamp >= date('now', 'start of day')
      GROUP BY model
      ORDER BY spend DESC
      LIMIT 1
    `).get() as { model: string; spend: number } | undefined;

    const topTeam = db.prepare(`
      SELECT team, SUM(cost_usd) AS spend
      FROM cost_events
      WHERE timestamp >= date('now', 'start of day')
      GROUP BY team
      ORDER BY spend DESC
      LIMIT 1
    `).get() as { model: string; spend: number; team: string } | undefined;

    const summary: DailySummary = {
      totalSpend: todaySpend.total_spend,
      requestCount: todaySpend.request_count,
      topModel: topModel ? { model: topModel.model, spend: topModel.spend } : null,
      topTeam: topTeam ? { team: topTeam.team, spend: topTeam.spend } : null,
      spendYesterday: yesterdaySpend.total_spend,
    };

    await sendDailySummary(summary);
    console.log("[Scheduler] Daily summary sent.");
  } catch (err) {
    console.error("[Scheduler] Daily summary failed:", err);
  }
}

async function generateAndSendWeeklySummary(): Promise<void> {
  try {
    const db = getDatabase();

    // Current week spend
    const thisWeek = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) AS total_spend,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE timestamp >= date('now', '-7 days')
    `).get() as { total_spend: number; request_count: number };

    // Previous week spend
    const lastWeek = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) AS total_spend
      FROM cost_events
      WHERE timestamp >= date('now', '-14 days')
        AND timestamp < date('now', '-7 days')
    `).get() as { total_spend: number };

    const topModel = db.prepare(`
      SELECT model, SUM(cost_usd) AS spend
      FROM cost_events
      WHERE timestamp >= date('now', '-7 days')
      GROUP BY model
      ORDER BY spend DESC
      LIMIT 1
    `).get() as { model: string; spend: number } | undefined;

    const topTeam = db.prepare(`
      SELECT team, SUM(cost_usd) AS spend
      FROM cost_events
      WHERE timestamp >= date('now', '-7 days')
      GROUP BY team
      ORDER BY spend DESC
      LIMIT 1
    `).get() as { team: string; spend: number } | undefined;

    const spendChangePct = lastWeek.total_spend > 0
      ? ((thisWeek.total_spend - lastWeek.total_spend) / lastWeek.total_spend) * 100
      : 0;

    // Generate basic recommendations
    const recommendations: string[] = [];

    if (spendChangePct > 20) {
      recommendations.push(`AI spend growing ${spendChangePct.toFixed(0)}%/week -- consider budget guardrails`);
    }

    const cacheStats = db.prepare(`
      SELECT
        CASE WHEN COUNT(*) > 0
          THEN CAST(SUM(CASE WHEN cache_read_tokens > 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100
          ELSE 0
        END AS cache_hit_rate
      FROM cost_events
      WHERE timestamp >= date('now', '-7 days')
    `).get() as { cache_hit_rate: number };

    if (cacheStats.cache_hit_rate < 10) {
      recommendations.push("Enable response caching -- similar deployments see 20-30% savings");
    }

    const summary: WeeklySummary = {
      totalSpend: thisWeek.total_spend,
      requestCount: thisWeek.request_count,
      topModel: topModel ? { model: topModel.model, spend: topModel.spend } : null,
      topTeam: topTeam ? { team: topTeam.team, spend: topTeam.spend } : null,
      spendChangePct,
      recommendations,
    };

    await sendWeeklySummary(summary);
    console.log("[Scheduler] Weekly summary sent.");
  } catch (err) {
    console.error("[Scheduler] Weekly summary failed:", err);
  }
}

function scheduleWeeklySummary(): void {
  const summaryHour = parseInt(process.env.DAILY_SUMMARY_HOUR || "9", 10);

  function scheduleNext(): void {
    const now = new Date();
    const next = new Date(now);

    // Find next Monday
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(summaryHour, 0, 0, 0);

    // If we're past the target time on Monday, schedule for next Monday
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 7);
    }

    const msUntilNext = next.getTime() - now.getTime();
    console.log(
      `[Scheduler] Weekly summary scheduled for ${next.toISOString()} (in ${Math.round(msUntilNext / 60000)} minutes)`
    );

    weeklySummaryTimeout = setTimeout(async () => {
      await generateAndSendWeeklySummary();
      scheduleNext();
    }, msUntilNext);
  }

  scheduleNext();
}

function scheduleDailySummary(): void {
  const summaryHour = parseInt(process.env.DAILY_SUMMARY_HOUR || "9", 10);

  function scheduleNext(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(summaryHour, 0, 0, 0);

    // If the target time has already passed today, schedule for tomorrow
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }

    const msUntilNext = next.getTime() - now.getTime();
    console.log(
      `[Scheduler] Daily summary scheduled for ${next.toISOString()} (in ${Math.round(msUntilNext / 60000)} minutes)`
    );

    dailySummaryTimeout = setTimeout(async () => {
      await generateAndSendDailySummary();
      scheduleNext();
    }, msUntilNext);
  }

  scheduleNext();
}

function loadReportSchedules(): void {
  try {
    const db = getDatabase();
    cachedSchedules = db.prepare(
      "SELECT * FROM report_schedules WHERE enabled = 1"
    ).all() as ReportScheduleRow[];
    lastScheduleLoad = Date.now();
    console.log(`[Scheduler] Loaded ${cachedSchedules.length} report schedule(s).`);
  } catch (err) {
    console.error("[Scheduler] Failed to load report schedules:", err);
  }
}

function shouldScheduleFire(schedule: ReportScheduleRow, now: Date): boolean {
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay(); // 0=Sun
  const currentDate = now.getUTCDate();

  // Must match the configured hour
  if (currentHour !== schedule.hour) return false;

  // Check frequency-specific day matching
  if (schedule.frequency === "weekly" && currentDay !== schedule.day_of_week) return false;
  if (schedule.frequency === "monthly" && currentDate !== schedule.day_of_month) return false;

  // Check if already sent this hour
  if (schedule.last_sent_at) {
    const lastSent = new Date(schedule.last_sent_at);
    const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return false;
  }

  return true;
}

async function checkReportSchedules(): Promise<void> {
  // Reload schedules every 5 minutes
  if (Date.now() - lastScheduleLoad > 5 * 60 * 1000) {
    loadReportSchedules();
  }

  const now = new Date();

  for (const schedule of cachedSchedules) {
    if (!shouldScheduleFire(schedule, now)) continue;

    try {
      console.log(`[Scheduler] Firing report schedule: ${schedule.name}`);
      const endDate = now.toISOString().slice(0, 10);
      const report = generateExecutiveReport(schedule.period, endDate);

      if (schedule.delivery === "slack") {
        await sendScheduledReport(
          { name: schedule.name, period: schedule.period },
          report
        );
      }

      // Update last_sent_at
      const db = getDatabase();
      db.prepare("UPDATE report_schedules SET last_sent_at = ? WHERE id = ?")
        .run(now.toISOString(), schedule.id);
      schedule.last_sent_at = now.toISOString();

      console.log(`[Scheduler] Report schedule "${schedule.name}" sent successfully.`);
    } catch (err) {
      console.error(`[Scheduler] Failed to fire report schedule "${schedule.name}":`, err);
    }
  }
}

export function startScheduler(): void {
  console.log("[Scheduler] Starting anomaly check every 5 minutes...");
  anomalyInterval = setInterval(() => {
    checkAnomalies();
  }, 5 * 60 * 1000);

  // Run an initial check after a short delay (let DB warm up)
  setTimeout(() => {
    checkAnomalies();
  }, 30_000);

  scheduleDailySummary();
  scheduleWeeklySummary();

  // Load and check report schedules every minute
  loadReportSchedules();
  reportScheduleInterval = setInterval(() => {
    checkReportSchedules();
  }, 60 * 1000);
  console.log("[Scheduler] Report schedule checker started (every 1 minute).");
}

export function stopScheduler(): void {
  if (anomalyInterval) {
    clearInterval(anomalyInterval);
    anomalyInterval = null;
  }
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
    dailySummaryTimeout = null;
  }
  if (weeklySummaryTimeout) {
    clearTimeout(weeklySummaryTimeout);
    weeklySummaryTimeout = null;
  }
  if (reportScheduleInterval) {
    clearInterval(reportScheduleInterval);
    reportScheduleInterval = null;
  }
  console.log("[Scheduler] Stopped.");
}
