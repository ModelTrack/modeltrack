import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/overview — high-level dashboard data
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Total spend today, this week, this month
    const [spendPeriods] = await db.all(`
      SELECT
        COALESCE(SUM(CASE WHEN timestamp >= DATE_TRUNC('day', CURRENT_TIMESTAMP) THEN cost_usd END), 0) AS spend_today,
        COALESCE(SUM(CASE WHEN timestamp >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN cost_usd END), 0) AS spend_this_week,
        COALESCE(SUM(CASE WHEN timestamp >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN cost_usd END), 0) AS spend_this_month,
        COUNT(*) AS total_requests
      FROM cost_events
    `);

    // Top model by spend
    const topModelRows = await db.all(`
      SELECT model, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY model
      ORDER BY spend DESC
      LIMIT 1
    `);

    // Top team by spend
    const topTeamRows = await db.all(`
      SELECT team, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY team
      ORDER BY spend DESC
      LIMIT 1
    `);

    // Spend trend last 30 days
    const trend = await db.all(`
      SELECT
        DATE_TRUNC('day', timestamp) AS day,
        SUM(cost_usd) AS spend,
        COUNT(*) AS requests
      FROM cost_events
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day ASC
    `);

    const topModel = (topModelRows as any[])[0] || null;
    const topTeam = (topTeamRows as any[])[0] || null;

    const overview = {
      spend_today: (spendPeriods as any)?.spend_today ?? 0,
      spend_this_week: (spendPeriods as any)?.spend_this_week ?? 0,
      spend_this_month: (spendPeriods as any)?.spend_this_month ?? 0,
      total_requests: (spendPeriods as any)?.total_requests ?? 0,
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
