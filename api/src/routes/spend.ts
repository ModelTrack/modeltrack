import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/spend — time series of spend
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      start_date,
      end_date,
      team,
      app_id,
      model,
      granularity = "day",
    } = req.query;

    const granMap: Record<string, string> = {
      hour: "hour",
      day: "day",
      week: "week",
      month: "month",
    };
    const gran = granMap[granularity as string] || "day";

    let query = `
      SELECT
        DATE_TRUNC('${gran}', timestamp) AS period,
        SUM(cost_usd) AS total_spend,
        COUNT(*) AS request_count,
        SUM(input_tokens + output_tokens) AS total_tokens
      FROM cost_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      query += ` AND timestamp >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND timestamp <= ?`;
      params.push(end_date);
    }
    if (team) {
      query += ` AND team = ?`;
      params.push(team);
    }
    if (app_id) {
      query += ` AND app_id = ?`;
      params.push(app_id);
    }
    if (model) {
      query += ` AND model = ?`;
      params.push(model);
    }

    query += ` GROUP BY period ORDER BY period ASC`;

    const db = getDatabase();
    const rows = await db.all(query, ...params);

    res.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/spend:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/spend/summary — totals for a date range
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (start_date) {
      whereClause += ` AND timestamp >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ` AND timestamp <= ?`;
      params.push(end_date);
    }

    const db = getDatabase();

    const [totalRow] = await db.all(
      `SELECT COALESCE(SUM(cost_usd), 0) AS total_spend,
              COUNT(*) AS total_requests
       FROM cost_events ${whereClause}`,
      ...params
    );

    const byTeam = await db.all(
      `SELECT team, SUM(cost_usd) AS spend
       FROM cost_events ${whereClause}
       GROUP BY team ORDER BY spend DESC`,
      ...params
    );

    const byModel = await db.all(
      `SELECT model, SUM(cost_usd) AS spend
       FROM cost_events ${whereClause}
       GROUP BY model ORDER BY spend DESC`,
      ...params
    );

    const byApp = await db.all(
      `SELECT app_id, SUM(cost_usd) AS spend
       FROM cost_events ${whereClause}
       GROUP BY app_id ORDER BY spend DESC`,
      ...params
    );

    const summary = {
      total_spend: totalRow?.total_spend ?? 0,
      total_requests: totalRow?.total_requests ?? 0,
      by_team: Object.fromEntries(
        byTeam.map((r: any) => [r.team, r.spend])
      ),
      by_model: Object.fromEntries(
        byModel.map((r: any) => [r.model, r.spend])
      ),
      by_app: Object.fromEntries(
        byApp.map((r: any) => [r.app_id, r.spend])
      ),
    };

    res.json({ data: summary, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/spend/summary:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
