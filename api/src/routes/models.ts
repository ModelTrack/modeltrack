import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/models — all models with usage stats
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT
        model,
        provider,
        SUM(cost_usd) AS total_spend,
        SUM(input_tokens) AS total_input_tokens,
        SUM(output_tokens) AS total_output_tokens,
        SUM(input_tokens + output_tokens) AS total_tokens,
        AVG(cost_usd) AS avg_cost_per_request,
        COUNT(*) AS request_count
      FROM cost_events
      GROUP BY model, provider
      ORDER BY total_spend DESC
    `).all();

    res.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/models:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
