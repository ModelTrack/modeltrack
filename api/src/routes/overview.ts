import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/overview — high-level dashboard data
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const startDate = (req.query.start_date as string) || null;
    const endDate = (req.query.end_date as string) || null;
    const hasDateFilter = startDate && endDate;

    // Total spend and requests for the selected period
    const dateParams = hasDateFilter ? [startDate, endDate] : [];
    const spendQuery = hasDateFilter
      ? `SELECT
           COALESCE(SUM(cost_usd), 0) AS total_spend,
           COUNT(*) AS total_requests
         FROM cost_events
         WHERE timestamp >= ? AND timestamp <= (? || 'T23:59:59Z')`
      : `SELECT
           COALESCE(SUM(CASE WHEN timestamp >= date('now', 'start of day') THEN cost_usd END), 0) AS spend_today,
           COALESCE(SUM(CASE WHEN timestamp >= date('now', 'weekday 0', '-7 days') THEN cost_usd END), 0) AS spend_this_week,
           COALESCE(SUM(CASE WHEN timestamp >= date('now', 'start of month') THEN cost_usd END), 0) AS spend_this_month,
           COUNT(*) AS total_requests
         FROM cost_events`;

    const spendPeriods = db.prepare(spendQuery).get(...dateParams) as any;

    // Top model by spend
    const topModelQuery = hasDateFilter
      ? `SELECT model, SUM(cost_usd) AS spend FROM cost_events WHERE timestamp >= ? AND timestamp <= (? || 'T23:59:59Z') GROUP BY model ORDER BY spend DESC LIMIT 1`
      : `SELECT model, SUM(cost_usd) AS spend FROM cost_events GROUP BY model ORDER BY spend DESC LIMIT 1`;
    const topModel = db.prepare(topModelQuery).get(...dateParams) as any;

    // Top team by spend
    const topTeamQuery = hasDateFilter
      ? `SELECT team, SUM(cost_usd) AS spend FROM cost_events WHERE timestamp >= ? AND timestamp <= (? || 'T23:59:59Z') GROUP BY team ORDER BY spend DESC LIMIT 1`
      : `SELECT team, SUM(cost_usd) AS spend FROM cost_events GROUP BY team ORDER BY spend DESC LIMIT 1`;
    const topTeam = db.prepare(topTeamQuery).get(...dateParams) as any;

    // Spend trend for the selected period
    const trendQuery = hasDateFilter
      ? `SELECT strftime('%Y-%m-%d', timestamp) AS day, SUM(cost_usd) AS spend, COUNT(*) AS requests
         FROM cost_events
         WHERE timestamp >= ? AND timestamp <= (? || 'T23:59:59Z')
         GROUP BY strftime('%Y-%m-%d', timestamp) ORDER BY day ASC`
      : `SELECT strftime('%Y-%m-%d', timestamp) AS day, SUM(cost_usd) AS spend, COUNT(*) AS requests
         FROM cost_events
         WHERE julianday('now') - julianday(timestamp) <= 30
         GROUP BY strftime('%Y-%m-%d', timestamp) ORDER BY day ASC`;
    const trend = db.prepare(trendQuery).all(...dateParams);

    const totalSpend = hasDateFilter ? (spendPeriods?.total_spend ?? 0) : null;
    const overview = {
      spend_today: totalSpend ?? (spendPeriods?.spend_today ?? 0),
      spend_this_week: totalSpend ?? (spendPeriods?.spend_this_week ?? 0),
      spend_this_month: totalSpend ?? (spendPeriods?.spend_this_month ?? 0),
      total_requests: spendPeriods?.total_requests ?? 0,
      top_model: topModel ? { model: topModel.model, spend: topModel.spend } : null,
      top_team: topTeam ? { team: topTeam.team, spend: topTeam.spend } : null,
      spend_trend: trend,
    };

    res.json({ data: overview, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/overview:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
