import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/infrastructure — infrastructure cost summary
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Total infrastructure cost
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) AS total
      FROM cost_events
      WHERE event_type IN ('aws_infrastructure', 'gpu_compute')
    `).get() as any;
    const totalInfraCost = totalRow?.total ?? 0;

    // By service
    const byService = db.prepare(`
      SELECT
        COALESCE(model, 'Unknown') AS service,
        SUM(cost_usd) AS cost,
        COUNT(*) AS events
      FROM cost_events
      WHERE event_type IN ('aws_infrastructure', 'gpu_compute')
      GROUP BY model
      ORDER BY cost DESC
    `).all() as any[];

    // By team
    const byTeam = db.prepare(`
      SELECT
        COALESCE(team, 'unassigned') AS team,
        SUM(cost_usd) AS cost,
        COUNT(*) AS events
      FROM cost_events
      WHERE event_type IN ('aws_infrastructure', 'gpu_compute')
      GROUP BY team
      ORDER BY cost DESC
    `).all() as any[];

    // GPU utilization — pull from metadata if available
    // Uses feature as resource_id and app_id as gpu_type for infrastructure events
    const gpuUtilization = db.prepare(`
      SELECT
        COALESCE(feature, 'unknown') AS resource_id,
        COALESCE(app_id, 'unknown') AS gpu_type,
        AVG(CAST(customer_tier AS REAL)) AS avg_utilization,
        SUM(cost_usd) AS cost,
        COALESCE(team, 'unassigned') AS team
      FROM cost_events
      WHERE event_type = 'gpu_compute'
        AND customer_tier IS NOT NULL
        AND customer_tier != ''
      GROUP BY feature, app_id, team
      ORDER BY cost DESC
    `).all() as any[];

    // Daily trend (last 30 days)
    const dailyTrend = db.prepare(`
      SELECT
        DATE(timestamp) AS date,
        SUM(cost_usd) AS cost
      FROM cost_events
      WHERE event_type IN ('aws_infrastructure', 'gpu_compute')
        AND timestamp >= DATE('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `).all() as any[];

    res.json({
      data: {
        total_infra_cost: totalInfraCost,
        by_service: byService.map((r) => ({
          service: r.service,
          cost: r.cost,
          events: r.events,
        })),
        by_team: byTeam.map((r) => ({
          team: r.team,
          cost: r.cost,
          events: r.events,
        })),
        gpu_utilization: gpuUtilization.map((r) => ({
          resource_id: r.resource_id,
          gpu_type: r.gpu_type,
          avg_utilization: r.avg_utilization ?? 0,
          cost: r.cost,
          team: r.team,
        })),
        daily_trend: dailyTrend.map((r) => ({
          date: r.date,
          cost: r.cost,
        })),
      },
      error: null,
    });
  } catch (err: any) {
    console.error("Error in GET /api/infrastructure:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
