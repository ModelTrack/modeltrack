import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/overview — high-level dashboard data
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Total spend today, this week, this month
    const spendPeriods = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN timestamp >= date('now', 'start of day') THEN cost_usd END), 0) AS spend_today,
        COALESCE(SUM(CASE WHEN timestamp >= date('now', 'weekday 0', '-7 days') THEN cost_usd END), 0) AS spend_this_week,
        COALESCE(SUM(CASE WHEN timestamp >= date('now', 'start of month') THEN cost_usd END), 0) AS spend_this_month,
        COUNT(*) AS total_requests
      FROM cost_events
    `).get() as any;

    // Top model by spend
    const topModel = db.prepare(`
      SELECT model, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY model
      ORDER BY spend DESC
      LIMIT 1
    `).get() as any;

    // Top team by spend
    const topTeam = db.prepare(`
      SELECT team, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY team
      ORDER BY spend DESC
      LIMIT 1
    `).get() as any;

    // Spend trend last 30 days
    const trend = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', timestamp) AS day,
        SUM(cost_usd) AS spend,
        COUNT(*) AS requests
      FROM cost_events
      WHERE julianday('now') - julianday(timestamp) <= 30
      GROUP BY strftime('%Y-%m-%d', timestamp)
      ORDER BY day ASC
    `).all();

    const overview = {
      spend_today: spendPeriods?.spend_today ?? 0,
      spend_this_week: spendPeriods?.spend_this_week ?? 0,
      spend_this_month: spendPeriods?.spend_this_month ?? 0,
      total_requests: spendPeriods?.total_requests ?? 0,
      top_model: topModel
        ? { model: topModel.model, spend: topModel.spend }
        : null,
      top_team: topTeam
        ? { team: topTeam.team, spend: topTeam.spend }
        : null,
      spend_trend: trend,
    };

    res.json({ data: overview, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/overview:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
