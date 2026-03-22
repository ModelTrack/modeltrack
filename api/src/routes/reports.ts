import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";
import type { ExecutiveReport, OptimizationAction } from "../models/types";

const router = Router();

function getPeriodDates(
  period: string,
  endDate: string
): { start: string; end: string; prevStart: string; prevEnd: string; label: string } {
  const end = new Date(endDate);
  const start = new Date(endDate);
  const prevEnd = new Date(endDate);
  const prevStart = new Date(endDate);

  let label: string;

  switch (period) {
    case "weekly": {
      start.setDate(end.getDate() - 6);
      prevEnd.setDate(start.getDate() - 1);
      prevStart.setDate(prevEnd.getDate() - 6);
      label = `Week of ${start.toISOString().slice(0, 10)}`;
      break;
    }
    case "quarterly": {
      start.setDate(end.getDate() - 89);
      prevEnd.setDate(start.getDate() - 1);
      prevStart.setDate(prevEnd.getDate() - 89);
      label = `Quarter ending ${end.toISOString().slice(0, 10)}`;
      break;
    }
    case "monthly":
    default: {
      start.setDate(end.getDate() - 29);
      prevEnd.setDate(start.getDate() - 1);
      prevStart.setDate(prevEnd.getDate() - 29);
      label = `Month ending ${end.toISOString().slice(0, 10)}`;
      break;
    }
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10),
    label,
  };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function generateRecommendations(
  report: Omit<ExecutiveReport, "recommendations">,
  prevAvgCostPerRequest: number,
  teamSpendPrev: Record<string, number>
): string[] {
  const recs: string[] = [];
  const { summary, spend_by_model, spend_by_feature, trends } = report;

  // Model concentration check
  if (spend_by_model.length > 0 && spend_by_model[0].pct_of_total > 60) {
    const dominant = spend_by_model[0].model;
    const cheapestFeature =
      spend_by_feature.length > 0
        ? spend_by_feature[spend_by_feature.length - 1].feature
        : null;
    if (cheapestFeature) {
      recs.push(
        `Consider using a cheaper model for "${cheapestFeature}" to reduce spend -- ${dominant} accounts for ${spend_by_model[0].pct_of_total.toFixed(0)}% of total spend`
      );
    }
  }

  // Cache hit rate check
  if (summary.cache_hit_rate < 10) {
    recs.push(
      "Enable response caching -- similar deployments see 20-30% savings"
    );
  }

  // Team spend increase check
  for (const team of report.spend_by_team) {
    const prevSpend = teamSpendPrev[team.team] ?? 0;
    if (prevSpend > 0) {
      const change = pctChange(team.spend, prevSpend);
      if (change > 50) {
        recs.push(
          `${team.team} spend increased ${change.toFixed(0)}% -- review recent usage`
        );
      }
    }
  }

  // Feature cost outlier check
  if (spend_by_feature.length > 2) {
    const costs = spend_by_feature.map((f) => f.avg_cost);
    const sorted = [...costs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    for (const feat of spend_by_feature) {
      if (median > 0 && feat.avg_cost > 2 * median) {
        const multiplier = (feat.avg_cost / median).toFixed(1);
        recs.push(
          `"${feat.feature}" costs $${feat.avg_cost.toFixed(4)} per request, ${multiplier}x the median -- investigate prompt efficiency`
        );
      }
    }
  }

  // Spend trend check
  if (trends.spend_change_pct > 20) {
    recs.push(
      `AI spend growing ${trends.spend_change_pct.toFixed(0)}%/period -- consider budget guardrails`
    );
  }

  return recs;
}

// GET /api/reports/executive
router.get("/executive", (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "monthly";
    const endDate = (req.query.end_date as string) || new Date().toISOString().slice(0, 10);

    if (!["weekly", "monthly", "quarterly"].includes(period)) {
      res.status(400).json({ data: null, error: "Invalid period. Use weekly, monthly, or quarterly." });
      return;
    }

    const dates = getPeriodDates(period, endDate);
    const db = getDatabase();

    // Current period summary
    const currentSummary = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) AS total_spend,
        COUNT(*) AS total_requests,
        COUNT(DISTINCT model) AS unique_models,
        COUNT(DISTINCT team) AS unique_teams,
        COUNT(DISTINCT CASE WHEN feature != '' THEN feature END) AS unique_features,
        CASE WHEN COUNT(*) > 0 THEN SUM(cost_usd) / COUNT(*) ELSE 0 END AS avg_cost_per_request,
        CASE WHEN COUNT(*) > 0
          THEN CAST(SUM(CASE WHEN cache_read_tokens > 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100
          ELSE 0
        END AS cache_hit_rate
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
    `).get(dates.start, dates.end) as any;

    // Previous period summary
    const prevSummary = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) AS total_spend,
        COUNT(*) AS total_requests,
        CASE WHEN COUNT(*) > 0 THEN SUM(cost_usd) / COUNT(*) ELSE 0 END AS avg_cost_per_request
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
    `).get(dates.prevStart, dates.prevEnd) as any;

    // Spend by team (current)
    const teamRows = db.prepare(`
      SELECT team, SUM(cost_usd) AS spend, COUNT(*) AS requests
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
      GROUP BY team
      ORDER BY spend DESC
    `).all(dates.start, dates.end) as Array<{ team: string; spend: number; requests: number }>;

    const totalSpend = currentSummary.total_spend || 0;
    const spendByTeam = teamRows.map((r) => ({
      team: r.team,
      spend: r.spend,
      requests: r.requests,
      pct_of_total: totalSpend > 0 ? (r.spend / totalSpend) * 100 : 0,
    }));

    // Previous period team spend (for recommendations)
    const prevTeamRows = db.prepare(`
      SELECT team, SUM(cost_usd) AS spend
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
      GROUP BY team
    `).all(dates.prevStart, dates.prevEnd) as Array<{ team: string; spend: number }>;

    const teamSpendPrev: Record<string, number> = {};
    for (const r of prevTeamRows) {
      teamSpendPrev[r.team] = r.spend;
    }

    // Spend by model
    const modelRows = db.prepare(`
      SELECT model, SUM(cost_usd) AS spend, COUNT(*) AS requests
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
      GROUP BY model
      ORDER BY spend DESC
    `).all(dates.start, dates.end) as Array<{ model: string; spend: number; requests: number }>;

    const spendByModel = modelRows.map((r) => ({
      model: r.model,
      spend: r.spend,
      requests: r.requests,
      pct_of_total: totalSpend > 0 ? (r.spend / totalSpend) * 100 : 0,
    }));

    // Spend by feature (top 10)
    const featureRows = db.prepare(`
      SELECT
        feature,
        SUM(cost_usd) AS spend,
        COUNT(*) AS requests,
        CASE WHEN COUNT(*) > 0 THEN SUM(cost_usd) / COUNT(*) ELSE 0 END AS avg_cost
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
        AND feature IS NOT NULL AND feature != ''
      GROUP BY feature
      ORDER BY spend DESC
      LIMIT 10
    `).all(dates.start, dates.end) as Array<{ feature: string; spend: number; requests: number; avg_cost: number }>;

    const spendByFeature = featureRows.map((r) => ({
      feature: r.feature,
      spend: r.spend,
      requests: r.requests,
      avg_cost: r.avg_cost,
    }));

    // Daily spend
    const dailyRows = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', timestamp) AS date,
        SUM(cost_usd) AS spend,
        COUNT(*) AS requests
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
      GROUP BY strftime('%Y-%m-%d', timestamp)
      ORDER BY date ASC
    `).all(dates.start, dates.end) as Array<{ date: string; spend: number; requests: number }>;

    // Optimization actions: budget enforcements
    const optimizationActions: OptimizationAction[] = [];

    const budgetEnforcements = db.prepare(`
      SELECT b.team, b.app_id, b.daily_limit_usd, b.monthly_limit_usd
      FROM budgets b
      WHERE b.daily_limit_usd > 0 OR b.monthly_limit_usd > 0
    `).all() as Array<{ team: string; app_id: string; daily_limit_usd: number; monthly_limit_usd: number }>;

    for (const b of budgetEnforcements) {
      const label = b.team || b.app_id || "global";
      if (b.monthly_limit_usd > 0) {
        optimizationActions.push({
          type: "budget_enforced",
          description: `Budget guardrail active for ${label}: $${b.monthly_limit_usd.toFixed(2)}/month`,
          estimated_savings: b.monthly_limit_usd * 0.1,
        });
      }
    }

    // Cache savings estimation
    const cacheStats = db.prepare(`
      SELECT
        SUM(cache_read_tokens) AS total_cache_reads,
        SUM(input_tokens) AS total_inputs
      FROM cost_events
      WHERE timestamp >= ? AND timestamp <= datetime(?, '+1 day')
    `).get(dates.start, dates.end) as { total_cache_reads: number; total_inputs: number } | undefined;

    if (cacheStats && cacheStats.total_cache_reads > 0 && cacheStats.total_inputs > 0) {
      const cacheRatio = cacheStats.total_cache_reads / cacheStats.total_inputs;
      const estimatedSavings = totalSpend * cacheRatio * 0.5;
      optimizationActions.push({
        type: "cache_savings",
        description: `Cache saved an estimated ${(cacheRatio * 100).toFixed(1)}% of input token costs`,
        estimated_savings: estimatedSavings,
      });
    }

    const trends = {
      spend_change_pct: pctChange(currentSummary.total_spend, prevSummary.total_spend),
      request_change_pct: pctChange(currentSummary.total_requests, prevSummary.total_requests),
      cost_efficiency_change_pct: pctChange(
        currentSummary.avg_cost_per_request,
        prevSummary.avg_cost_per_request
      ),
    };

    const reportWithoutRecs: Omit<ExecutiveReport, "recommendations"> = {
      period: { start: dates.start, end: dates.end, label: dates.label },
      summary: {
        total_spend: currentSummary.total_spend,
        total_requests: currentSummary.total_requests,
        unique_models: currentSummary.unique_models,
        unique_teams: currentSummary.unique_teams,
        unique_features: currentSummary.unique_features,
        avg_cost_per_request: currentSummary.avg_cost_per_request,
        cache_hit_rate: currentSummary.cache_hit_rate,
      },
      trends,
      spend_by_team: spendByTeam,
      spend_by_model: spendByModel,
      spend_by_feature: spendByFeature,
      daily_spend: dailyRows,
      optimization_actions: optimizationActions,
    };

    const recommendations = generateRecommendations(
      reportWithoutRecs,
      prevSummary.avg_cost_per_request,
      teamSpendPrev
    );

    const report: ExecutiveReport = {
      ...reportWithoutRecs,
      recommendations,
    };

    res.json({ data: report, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/reports/executive:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/reports/list — available report periods
router.get("/list", (_req: Request, res: Response) => {
  try {
    const periods: Array<{ period: string; start: string; end: string; label: string }> = [];
    const now = new Date();

    // Last 6 months of weekly reports
    for (let i = 0; i < 26; i++) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      periods.push({
        period: "weekly",
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: `Week of ${start.toISOString().slice(0, 10)}`,
      });
    }

    // Last 6 months of monthly reports
    for (let i = 0; i < 6; i++) {
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      periods.push({
        period: "monthly",
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: `${end.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      });
    }

    res.json({ data: periods, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/reports/list:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
