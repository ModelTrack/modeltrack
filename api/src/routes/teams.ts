import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/teams — all teams with spend breakdown
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const teamTotals = db.prepare(`
      SELECT
        team,
        SUM(cost_usd) AS total_spend,
        COUNT(*) AS request_count
      FROM cost_events
      GROUP BY team
      ORDER BY total_spend DESC
    `).all();

    const teamModels = db.prepare(`
      SELECT team, model, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY team, model
    `).all();

    const teamApps = db.prepare(`
      SELECT team, app_id, SUM(cost_usd) AS spend
      FROM cost_events
      GROUP BY team, app_id
    `).all();

    const modelMap: Record<string, Record<string, number>> = {};
    for (const row of teamModels as any[]) {
      if (!modelMap[row.team]) modelMap[row.team] = {};
      modelMap[row.team][row.model] = row.spend;
    }

    const appMap: Record<string, Record<string, number>> = {};
    for (const row of teamApps as any[]) {
      if (!appMap[row.team]) appMap[row.team] = {};
      appMap[row.team][row.app_id] = row.spend;
    }

    const teams = (teamTotals as any[]).map((t) => ({
      team: t.team,
      total_spend: t.total_spend,
      request_count: t.request_count,
      by_model: modelMap[t.team] || {},
      by_app: appMap[t.team] || {},
    }));

    res.json({ data: teams, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/teams:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
