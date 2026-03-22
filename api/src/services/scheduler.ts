import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/init";
import { sendAlert, sendBudgetWarning, sendDailySummary } from "./slack";
import type { Alert } from "../models/types";
import type { DailySummary } from "./slack";

// Track which alerts have been sent: Set of "team:hour" keys
const sentAlerts = new Set<string>();
let lastClearDay: string = "";

let anomalyInterval: ReturnType<typeof setInterval> | null = null;
let dailySummaryTimeout: ReturnType<typeof setTimeout> | null = null;

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
  console.log("[Scheduler] Stopped.");
}
