import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

interface PromptRow {
  prompt_id: string;
  request_count: number;
  total_cost: number;
  avg_cost: number;
  avg_system_tokens: number;
  avg_user_tokens: number;
  avg_total_input_tokens: number;
  avg_output_tokens: number;
  cost_per_request: number;
  models_used: string;
  features: string;
  teams: string;
}

function generateSuggestions(row: PromptRow): string[] {
  const suggestions: string[] = [];

  if (row.avg_system_tokens > 1000) {
    const rounded = Math.round(row.avg_system_tokens).toLocaleString();
    suggestions.push(
      `System prompt averages ${rounded} tokens — consider shortening`
    );
  }

  if (
    row.avg_output_tokens > 0 &&
    row.avg_total_input_tokens > 0 &&
    row.avg_output_tokens > row.avg_total_input_tokens * 2
  ) {
    const ratio = Math.round(row.avg_output_tokens / row.avg_total_input_tokens);
    suggestions.push(
      `High output token ratio (${ratio}:1 output:input) — consider setting max_tokens lower`
    );
  }

  const models = (row.models_used || "").toLowerCase();
  if (models.includes("opus")) {
    suggestions.push(
      "Used with expensive model (claude-opus) — consider claude-sonnet for this template"
    );
  }

  if (row.request_count > 100) {
    suggestions.push(
      `Same prompt called ${row.request_count.toLocaleString()}+ times — enable response caching`
    );
  }

  return suggestions;
}

// GET /api/prompts — all prompt templates/fingerprints with cost metrics
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, team, feature, sort_by } = req.query;

    const conditions: string[] = [
      "prompt_hash IS NOT NULL",
      "prompt_hash != ''",
    ];
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
    if (feature) {
      conditions.push("feature = ?");
      params.push(feature);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortColumn = sort_by === "request_count"
      ? "request_count"
      : sort_by === "avg_cost"
        ? "avg_cost"
        : sort_by === "avg_system_tokens"
          ? "avg_system_tokens"
          : "total_cost";

    const rows = db.prepare(`
      SELECT
        COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
        COUNT(*) AS request_count,
        SUM(cost_usd) AS total_cost,
        AVG(cost_usd) AS avg_cost,
        AVG(system_prompt_tokens) AS avg_system_tokens,
        AVG(user_prompt_tokens) AS avg_user_tokens,
        AVG(input_tokens) AS avg_total_input_tokens,
        AVG(output_tokens) AS avg_output_tokens,
        SUM(cost_usd) * 1.0 / COUNT(*) AS cost_per_request,
        GROUP_CONCAT(DISTINCT model) AS models_used,
        GROUP_CONCAT(DISTINCT feature) AS features,
        GROUP_CONCAT(DISTINCT team) AS teams
      FROM cost_events
      ${where}
      GROUP BY prompt_id
      ORDER BY ${sortColumn} DESC
    `).all(...params) as PromptRow[];

    const data = rows.map((row) => ({
      prompt_id: row.prompt_id,
      request_count: row.request_count,
      total_cost: row.total_cost,
      avg_cost_per_request: row.cost_per_request,
      avg_system_tokens: row.avg_system_tokens,
      avg_user_tokens: row.avg_user_tokens,
      avg_output_tokens: row.avg_output_tokens,
      models_used: row.models_used || "",
      features: row.features || "",
      teams: row.teams || "",
      optimization_suggestions: generateSuggestions(row),
    }));

    res.json({ data, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/prompts:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/prompts/summary — high-level prompt analysis stats
router.get("/summary", (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const totalUnique = db.prepare(`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(prompt_template_id, ''), prompt_hash)) AS cnt
      FROM cost_events
      WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
    `).get() as any;

    const mostExpensive = db.prepare(`
      SELECT
        COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
        SUM(cost_usd) AS total_cost
      FROM cost_events
      WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
      GROUP BY prompt_id
      ORDER BY total_cost DESC
      LIMIT 1
    `).get() as any;

    const longestSystem = db.prepare(`
      SELECT
        COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
        AVG(system_prompt_tokens) AS avg_system_tokens
      FROM cost_events
      WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
      GROUP BY prompt_id
      ORDER BY avg_system_tokens DESC
      LIMIT 1
    `).get() as any;

    const mostCacheable = db.prepare(`
      SELECT
        COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
      GROUP BY prompt_id
      ORDER BY request_count DESC
      LIMIT 1
    `).get() as any;

    // Estimate potential savings from top 5 recommendations.
    // Rough heuristic: long system prompts could save 30% of their cost if shortened,
    // high-repeat prompts could save via caching, expensive models could be downgraded.
    const topPrompts = db.prepare(`
      SELECT
        COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
        SUM(cost_usd) AS total_cost,
        AVG(system_prompt_tokens) AS avg_system_tokens,
        AVG(output_tokens) AS avg_output_tokens,
        AVG(input_tokens) AS avg_input_tokens,
        COUNT(*) AS request_count,
        GROUP_CONCAT(DISTINCT model) AS models_used
      FROM cost_events
      WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
      GROUP BY prompt_id
      ORDER BY total_cost DESC
      LIMIT 5
    `).all() as any[];

    let potentialSavings = 0;
    for (const p of topPrompts) {
      if (p.avg_system_tokens > 1000) {
        potentialSavings += p.total_cost * 0.2;
      }
      if (p.request_count > 100) {
        potentialSavings += p.total_cost * 0.15;
      }
      const models = (p.models_used || "").toLowerCase();
      if (models.includes("opus")) {
        potentialSavings += p.total_cost * 0.5;
      }
    }

    res.json({
      data: {
        total_unique_prompts: totalUnique?.cnt || 0,
        most_expensive_prompt: mostExpensive
          ? { id: mostExpensive.prompt_id, total_cost: mostExpensive.total_cost }
          : null,
        longest_system_prompt: longestSystem
          ? { id: longestSystem.prompt_id, avg_system_tokens: longestSystem.avg_system_tokens }
          : null,
        most_cacheable: mostCacheable
          ? { id: mostCacheable.prompt_id, request_count: mostCacheable.request_count }
          : null,
        potential_savings: Math.round(potentialSavings * 100) / 100,
      },
      error: null,
    });
  } catch (err: any) {
    console.error("Error in GET /api/prompts/summary:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
