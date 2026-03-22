import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/features — all features with cost metrics
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, team, app_id } = req.query;

    const conditions: string[] = ["feature IS NOT NULL", "feature != ''"];
    const params: any[] = [];

    if (start_date) {
      conditions.push("timestamp >= ?");
      params.push(start_date);
    }
    if (end_date) {
      conditions.push("timestamp <= ?");
      params.push(end_date);
    }
    if (team) {
      conditions.push("team = ?");
      params.push(team);
    }
    if (app_id) {
      conditions.push("app_id = ?");
      params.push(app_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get feature aggregates
    const features = db.prepare(`
      SELECT
        feature,
        SUM(cost_usd) AS total_cost,
        COUNT(*) AS request_count,
        SUM(cost_usd) * 1.0 / COUNT(*) AS avg_cost_per_request,
        SUM(input_tokens) AS total_input_tokens,
        SUM(output_tokens) AS total_output_tokens
      FROM cost_events
      ${where}
      GROUP BY feature
      ORDER BY total_cost DESC
    `).all(...params);

    // Get primary model per feature (most used model)
    const modelRows = db.prepare(`
      SELECT feature, model, COUNT(*) AS cnt
      FROM cost_events
      ${where}
      GROUP BY feature, model
    `).all(...params) as any[];

    const primaryModel: Record<string, string> = {};
    const modelCounts: Record<string, Record<string, number>> = {};
    for (const row of modelRows) {
      if (!modelCounts[row.feature]) modelCounts[row.feature] = {};
      modelCounts[row.feature][row.model] = row.cnt;
    }
    for (const [feat, models] of Object.entries(modelCounts)) {
      let best = "";
      let bestCnt = 0;
      for (const [model, cnt] of Object.entries(models)) {
        if (cnt > bestCnt) {
          best = model;
          bestCnt = cnt;
        }
      }
      primaryModel[feat] = best;
    }

    // Get primary team per feature (team with most usage)
    const teamRows = db.prepare(`
      SELECT feature, team, COUNT(*) AS cnt
      FROM cost_events
      ${where}
      GROUP BY feature, team
    `).all(...params) as any[];

    const primaryTeam: Record<string, string> = {};
    const teamCounts: Record<string, Record<string, number>> = {};
    for (const row of teamRows) {
      if (!teamCounts[row.feature]) teamCounts[row.feature] = {};
      teamCounts[row.feature][row.team] = row.cnt;
    }
    for (const [feat, teams] of Object.entries(teamCounts)) {
      let best = "";
      let bestCnt = 0;
      for (const [team, cnt] of Object.entries(teams)) {
        if (cnt > bestCnt) {
          best = team;
          bestCnt = cnt;
        }
      }
      primaryTeam[feat] = best;
    }

    const data = (features as any[]).map((f) => ({
      feature: f.feature,
      total_cost: f.total_cost,
      request_count: f.request_count,
      avg_cost_per_request: f.avg_cost_per_request,
      total_input_tokens: f.total_input_tokens,
      total_output_tokens: f.total_output_tokens,
      primary_model: primaryModel[f.feature] || "",
      primary_team: primaryTeam[f.feature] || "",
    }));

    res.json({ data, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/features:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/features/:name — detailed view for one feature
router.get("/:name", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const featureName = req.params.name;

    // Cost over time (daily)
    const costOverTime = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', timestamp) AS day,
        SUM(cost_usd) AS daily_cost,
        COUNT(*) AS daily_requests
      FROM cost_events
      WHERE feature = ?
      GROUP BY strftime('%Y-%m-%d', timestamp)
      ORDER BY day ASC
    `).all(featureName);

    // Breakdown by model
    const byModel = db.prepare(`
      SELECT
        model,
        SUM(cost_usd) AS total_cost,
        COUNT(*) AS request_count,
        SUM(input_tokens) AS total_input_tokens,
        SUM(output_tokens) AS total_output_tokens
      FROM cost_events
      WHERE feature = ?
      GROUP BY model
      ORDER BY total_cost DESC
    `).all(featureName);

    // Breakdown by team
    const byTeam = db.prepare(`
      SELECT
        team,
        SUM(cost_usd) AS total_cost,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE feature = ?
      GROUP BY team
      ORDER BY total_cost DESC
    `).all(featureName);

    // Avg tokens per request
    const tokenAvgs = db.prepare(`
      SELECT
        AVG(input_tokens) AS avg_input_tokens,
        AVG(output_tokens) AS avg_output_tokens
      FROM cost_events
      WHERE feature = ?
    `).get(featureName);

    res.json({
      data: {
        feature: featureName,
        cost_over_time: costOverTime,
        by_model: byModel,
        by_team: byTeam,
        avg_tokens: tokenAvgs,
      },
      error: null,
    });
  } catch (err: any) {
    console.error(`Error in GET /api/features/${req.params.name}:`, err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
