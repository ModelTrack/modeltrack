import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/alerts — recent anomalies (hourly spend > 2x average for that hour)
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Find hours where spend is > 2x the overall hourly average
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
      ORDER BY h.hour DESC
      LIMIT 100
    `).all();

    const alerts = (rows as any[]).map((r) => ({
      id: uuidv4(),
      type: "anomaly" as const,
      message: `Team "${r.team}" spent $${r.hourly_spend.toFixed(4)} in hour ${r.hour}, which is ${(r.hourly_spend / r.avg_spend).toFixed(1)}x the average ($${r.avg_spend.toFixed(4)})`,
      team: r.team,
      hour: r.hour,
      hourly_spend: r.hourly_spend,
      avg_spend: r.avg_spend,
      created_at: new Date().toISOString(),
    }));

    res.json({ data: alerts, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/alerts:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/alerts/budgets — set a budget for a team/app
router.post("/budgets", (req: Request, res: Response) => {
  try {
    const { team, app_id, daily_limit_usd, monthly_limit_usd } = req.body;

    if (!daily_limit_usd && !monthly_limit_usd) {
      res.status(400).json({
        data: null,
        error: "At least one of daily_limit_usd or monthly_limit_usd is required.",
      });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO budgets (id, team, app_id, daily_limit_usd, monthly_limit_usd)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      id,
      team || "",
      app_id || "",
      daily_limit_usd || 0,
      monthly_limit_usd || 0
    );

    const budget = {
      id,
      team: team || "",
      app_id: app_id || "",
      daily_limit_usd: daily_limit_usd || 0,
      monthly_limit_usd: monthly_limit_usd || 0,
      created_at: new Date().toISOString(),
    };

    res.status(201).json({ data: budget, error: null });
  } catch (err: any) {
    console.error("Error in POST /api/alerts/budgets:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/alerts/budgets — list all budgets
router.get("/budgets", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM budgets ORDER BY created_at DESC`).all();
    res.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/alerts/budgets:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
