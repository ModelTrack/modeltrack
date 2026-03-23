import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";
import type { ModelPricing } from "../models/types";

const router = Router();

// Hardcoded pricing from proxy/pricing.go (per million tokens)
const MODEL_PRICING: ModelPricing[] = [
  // Anthropic
  { provider: "anthropic", model: "claude-opus-4-6", input_per_mtok: 15.0, output_per_mtok: 75.0 },
  { provider: "anthropic", model: "claude-sonnet-4-6", input_per_mtok: 3.0, output_per_mtok: 15.0 },
  { provider: "anthropic", model: "claude-haiku-4-5", input_per_mtok: 0.80, output_per_mtok: 4.0 },
  // OpenAI
  { provider: "openai", model: "gpt-4o", input_per_mtok: 2.50, output_per_mtok: 10.0 },
  { provider: "openai", model: "gpt-4o-mini", input_per_mtok: 0.15, output_per_mtok: 0.60 },
  { provider: "openai", model: "gpt-4.1", input_per_mtok: 2.0, output_per_mtok: 8.0 },
  { provider: "openai", model: "gpt-4.1-mini", input_per_mtok: 0.40, output_per_mtok: 1.60 },
  { provider: "openai", model: "gpt-4.1-nano", input_per_mtok: 0.10, output_per_mtok: 0.40 },
  { provider: "openai", model: "o3", input_per_mtok: 2.0, output_per_mtok: 8.0 },
  { provider: "openai", model: "o4-mini", input_per_mtok: 1.10, output_per_mtok: 4.40 },
];

// Cache pricing (per million tokens) — only Anthropic models have cache pricing
const CACHE_READ_PRICING: Record<string, number> = {
  "claude-opus-4-6": 1.5,
  "claude-sonnet-4-6": 0.3,
  "claude-haiku-4-5": 0.08,
};

function calculateCostPerRequest(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  return (inputTokens * pricing.input_per_mtok) / 1_000_000 +
    (outputTokens * pricing.output_per_mtok) / 1_000_000;
}

function calculateCachedCostPerRequest(
  inputTokens: number,
  outputTokens: number,
  cacheHitRate: number,
  pricing: ModelPricing
): number {
  const cacheReadRate = CACHE_READ_PRICING[pricing.model] ?? pricing.input_per_mtok;
  const cachedInputCost = inputTokens * cacheHitRate * cacheReadRate / 1_000_000;
  const uncachedInputCost = inputTokens * (1 - cacheHitRate) * pricing.input_per_mtok / 1_000_000;
  const outputCost = outputTokens * pricing.output_per_mtok / 1_000_000;
  return cachedInputCost + uncachedInputCost + outputCost;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// POST /api/estimator/calculate
router.post("/calculate", (req: Request, res: Response) => {
  try {
    const {
      model,
      avg_input_tokens,
      avg_output_tokens,
      requests_per_day,
      cache_hit_rate = 0,
      description,
    } = req.body;

    if (!model || avg_input_tokens == null || avg_output_tokens == null || requests_per_day == null) {
      res.status(400).json({
        data: null,
        error: "Missing required fields: model, avg_input_tokens, avg_output_tokens, requests_per_day",
      });
      return;
    }

    const selectedPricing = MODEL_PRICING.find((p) => p.model === model);
    if (!selectedPricing) {
      res.status(400).json({ data: null, error: `Unknown model: ${model}` });
      return;
    }

    // Calculate base estimate (no caching)
    const costPerRequest = calculateCostPerRequest(avg_input_tokens, avg_output_tokens, selectedPricing);
    const dailyCost = costPerRequest * requests_per_day;
    const weeklyCost = dailyCost * 7;
    const monthlyCost = dailyCost * 30;
    const quarterlyCost = monthlyCost * 3;
    const annualCost = monthlyCost * 12;

    // Calculate with caching
    const cachedCostPerRequest = calculateCachedCostPerRequest(
      avg_input_tokens,
      avg_output_tokens,
      cache_hit_rate,
      selectedPricing
    );
    const cachedDailyCost = cachedCostPerRequest * requests_per_day;
    const cachedMonthlyCost = cachedDailyCost * 30;
    const savingsVsNoCache = monthlyCost - cachedMonthlyCost;
    const savingsPct = monthlyCost > 0 ? (savingsVsNoCache / monthlyCost) * 100 : 0;

    // Model comparison
    const modelComparison = MODEL_PRICING.map((p) => {
      const cpr = calculateCostPerRequest(avg_input_tokens, avg_output_tokens, p);
      const mc = cpr * requests_per_day * 30;
      const isSelected = p.model === model;
      return {
        model: p.model,
        provider: p.provider,
        cost_per_request: round2(cpr * 10000) / 10000, // keep 4 decimals
        monthly_cost: round2(mc),
        is_selected: isSelected,
        savings_vs_selected: isSelected ? 0 : round2(monthlyCost - mc),
      };
    }).sort((a, b) => a.monthly_cost - b.monthly_cost);

    // Find similar existing features (±30% token profile)
    let similarFeatures: Array<{
      feature: string;
      avg_cost_per_request: number;
      monthly_cost: number;
      request_count: number;
    }> = [];

    try {
      const db = getDatabase();
      const minInput = avg_input_tokens * 0.7;
      const maxInput = avg_input_tokens * 1.3;
      const minOutput = avg_output_tokens * 0.7;
      const maxOutput = avg_output_tokens * 1.3;

      const rows = db.prepare(`
        SELECT
          feature,
          AVG(cost_usd) AS avg_cost_per_request,
          SUM(cost_usd) AS total_cost,
          COUNT(*) AS request_count,
          AVG(input_tokens) AS avg_input,
          AVG(output_tokens) AS avg_output
        FROM cost_events
        WHERE feature IS NOT NULL AND feature != ''
        GROUP BY feature
        HAVING avg_input BETWEEN ? AND ?
          AND avg_output BETWEEN ? AND ?
        ORDER BY total_cost DESC
        LIMIT 5
      `).all(minInput, maxInput, minOutput, maxOutput) as any[];

      similarFeatures = rows.map((r) => ({
        feature: r.feature,
        avg_cost_per_request: round2(r.avg_cost_per_request * 10000) / 10000,
        monthly_cost: round2(r.avg_cost_per_request * r.request_count),
        request_count: r.request_count,
      }));
    } catch {
      // DB may not be available; return empty similar features
    }

    res.json({
      data: {
        estimate: {
          cost_per_request: round2(costPerRequest * 10000) / 10000,
          daily_cost: round2(dailyCost),
          weekly_cost: round2(weeklyCost),
          monthly_cost: round2(monthlyCost),
          quarterly_cost: round2(quarterlyCost),
          annual_cost: round2(annualCost),
        },
        with_caching: {
          cost_per_request: round2(cachedCostPerRequest * 10000) / 10000,
          daily_cost: round2(cachedDailyCost),
          monthly_cost: round2(cachedMonthlyCost),
          savings_vs_no_cache: round2(savingsVsNoCache),
          savings_pct: round2(savingsPct),
        },
        model_comparison: modelComparison,
        similar_features: similarFeatures,
      },
      error: null,
    });
  } catch (err: any) {
    console.error("Error in POST /api/estimator/calculate:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/estimator/models — all models with pricing
router.get("/models", (_req: Request, res: Response) => {
  try {
    res.json({ data: MODEL_PRICING, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/estimator/models:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
