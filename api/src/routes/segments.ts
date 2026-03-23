import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/segments — spend grouped by customer_tier with model breakdown
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const tierTotals = db.prepare(`
      SELECT
        customer_tier,
        SUM(cost_usd) AS total_cost,
        COUNT(*) AS request_count,
        CASE WHEN COUNT(*) > 0 THEN SUM(cost_usd) / COUNT(*) ELSE 0 END AS avg_cost_per_request
      FROM cost_events
      WHERE customer_tier IS NOT NULL AND customer_tier != ''
      GROUP BY customer_tier
      ORDER BY total_cost DESC
    `).all();

    const tierModels = db.prepare(`
      SELECT customer_tier, model, SUM(cost_usd) AS spend, COUNT(*) AS request_count
      FROM cost_events
      WHERE customer_tier IS NOT NULL AND customer_tier != ''
      GROUP BY customer_tier, model
    `).all();

    const modelMap: Record<string, Array<{ model: string; spend: number; request_count: number }>> = {};
    for (const row of tierModels as any[]) {
      if (!modelMap[row.customer_tier]) modelMap[row.customer_tier] = [];
      modelMap[row.customer_tier].push({
        model: row.model,
        spend: row.spend,
        request_count: row.request_count,
      });
    }

    const segments = (tierTotals as any[]).map((t) => ({
      customer_tier: t.customer_tier,
      total_cost: t.total_cost,
      request_count: t.request_count,
      avg_cost_per_request: t.avg_cost_per_request,
      by_model: modelMap[t.customer_tier] || [],
    }));

    res.json({ data: segments, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/segments:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
