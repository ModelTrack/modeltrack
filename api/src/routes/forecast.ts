import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// --- Linear regression (least squares) ---
function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation for confidence
  const meanY = sumY / n;
  const ssRes = points.reduce(
    (s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2),
    0
  );
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function stddevResiduals(
  points: { x: number; y: number }[],
  slope: number,
  intercept: number
): number {
  if (points.length < 2) return 0;
  const sumSqRes = points.reduce(
    (s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2),
    0
  );
  return Math.sqrt(sumSqRes / (points.length - 2));
}

function confidenceLevel(r2: number, dataPoints: number): "low" | "medium" | "high" {
  if (dataPoints < 14) return "low";
  if (r2 >= 0.7 && dataPoints >= 30) return "high";
  if (r2 >= 0.4 && dataPoints >= 21) return "medium";
  return "low";
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function aggregateToGranularity(
  points: Array<{ date: string; value: number }>,
  granularity: string
): Array<{ date: string; value: number }> {
  if (granularity === "day") return points;

  const buckets = new Map<string, { date: string; value: number }>();

  for (const p of points) {
    let key: string;
    const d = new Date(p.date);
    if (granularity === "week") {
      // Group by ISO week start (Monday)
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      key = monday.toISOString().slice(0, 10);
    } else {
      // month
      key = p.date.slice(0, 7) + "-01";
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.value += p.value;
    } else {
      buckets.set(key, { date: key, value: p.value });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// GET /api/forecast
router.get("/", (req: Request, res: Response) => {
  try {
    const horizonDays = Math.min(
      Math.max(parseInt(req.query.horizon_days as string, 10) || 90, 1),
      365
    );
    const granularity = (req.query.granularity as string) || "week";
    const team = req.query.team as string | undefined;
    const model = req.query.model as string | undefined;

    if (!["day", "week", "month"].includes(granularity)) {
      res
        .status(400)
        .json({ data: null, error: "Invalid granularity. Use day, week, or month." });
      return;
    }

    const db = getDatabase();

    // 1. Pull daily spend for last 60 days
    let query = `
      SELECT
        strftime('%Y-%m-%d', timestamp) AS day,
        SUM(cost_usd) AS spend
      FROM cost_events
      WHERE julianday('now') - julianday(timestamp) <= 60
    `;
    const params: any[] = [];

    if (team) {
      query += ` AND team = ?`;
      params.push(team);
    }
    if (model) {
      query += ` AND model = ?`;
      params.push(model);
    }

    query += ` GROUP BY strftime('%Y-%m-%d', timestamp) ORDER BY day ASC`;

    const rows = db.prepare(query).all(...params) as Array<{
      day: string;
      spend: number;
    }>;

    // Build complete 60-day series (fill missing days with 0)
    const today = new Date().toISOString().slice(0, 10);
    const dayMap = new Map<string, number>();
    for (const r of rows) {
      dayMap.set(r.day, r.spend);
    }

    const historicalDaily: Array<{ date: string; spend: number }> = [];
    for (let i = 59; i >= 0; i--) {
      const d = addDays(today, -i);
      historicalDaily.push({ date: d, spend: dayMap.get(d) ?? 0 });
    }

    // 2. Linear regression on daily spend
    const regressionPoints = historicalDaily.map((h, idx) => ({
      x: idx,
      y: h.spend,
    }));
    const { slope, intercept, r2 } = linearRegression(regressionPoints);
    const stddev = stddevResiduals(regressionPoints, slope, intercept);

    // 3. Project forward
    const startIdx = regressionPoints.length; // day index after last historical
    const forecastDaily: Array<{
      date: string;
      predicted: number;
      low: number;
      high: number;
    }> = [];

    for (let i = 0; i < horizonDays; i++) {
      const dayIdx = startIdx + i;
      const predicted = Math.max(0, slope * dayIdx + intercept);
      const low = Math.max(0, predicted - 1.5 * stddev);
      const high = predicted + 1.5 * stddev;
      forecastDaily.push({
        date: addDays(today, i + 1),
        predicted,
        low,
        high,
      });
    }

    // 4. Build summary
    const last30 = historicalDaily.slice(-30);
    const last30Spend = last30.reduce((s, d) => s + d.spend, 0);
    const currentMonthlyRunRate = last30Spend; // last 30 days = ~1 month

    const next30Forecast = forecastDaily
      .slice(0, 30)
      .reduce((s, d) => s + d.predicted, 0);
    const next90Forecast = forecastDaily
      .slice(0, Math.min(90, horizonDays))
      .reduce((s, d) => s + d.predicted, 0);

    // Growth rate: compare first 30 days vs last 30 days of the 60-day historical
    const first30Spend = historicalDaily
      .slice(0, 30)
      .reduce((s, d) => s + d.spend, 0);
    const growthRatePct =
      first30Spend > 0
        ? ((last30Spend - first30Spend) / first30Spend) * 100
        : last30Spend > 0
        ? 100
        : 0;

    const dataPointCount = rows.length;
    const confidence = confidenceLevel(r2, dataPointCount);

    // 5. Scenarios
    const currentTrendMonthly = next30Forecast;
    const currentTrendQuarterly = next90Forecast;

    const trafficDoublesMonthly = next30Forecast * 2;
    const trafficDoublesQuarterly = next90Forecast * 2;

    // Find the most expensive and cheapest model for "switch to cheaper model" scenario
    let cheaperModelScenario = {
      monthly: currentTrendMonthly,
      quarterly: currentTrendQuarterly,
      savings: 0,
      description: "No alternative model data available",
    };

    let modelQuery = `
      SELECT model, SUM(cost_usd) AS spend, COUNT(*) AS requests
      FROM cost_events
      WHERE julianday('now') - julianday(timestamp) <= 30
    `;
    const modelParams: any[] = [];
    if (team) {
      modelQuery += ` AND team = ?`;
      modelParams.push(team);
    }
    modelQuery += ` GROUP BY model ORDER BY spend DESC`;

    const modelRows = db.prepare(modelQuery).all(...modelParams) as Array<{
      model: string;
      spend: number;
      requests: number;
    }>;

    if (modelRows.length >= 2) {
      const topModel = modelRows[0];
      const cheaperModel = modelRows[modelRows.length - 1];
      const topCostPerReq = topModel.spend / topModel.requests;
      const cheaperCostPerReq = cheaperModel.spend / cheaperModel.requests;

      if (topCostPerReq > cheaperCostPerReq) {
        const savingsPerReq = topCostPerReq - cheaperCostPerReq;
        const monthlySavings = savingsPerReq * topModel.requests;
        const quarterlySavings = monthlySavings * 3;

        cheaperModelScenario = {
          monthly: Math.max(0, currentTrendMonthly - monthlySavings),
          quarterly: Math.max(0, currentTrendQuarterly - quarterlySavings),
          savings: quarterlySavings,
          description: `Switch top model from ${topModel.model} to ${cheaperModel.model}`,
        };
      }
    }

    // Aggregate historical and forecast to requested granularity
    const historicalAggregated = aggregateToGranularity(
      historicalDaily.map((h) => ({ date: h.date, value: h.spend })),
      granularity
    ).map((a) => ({ date: a.date, spend: a.value }));

    // For forecast, aggregate predicted/low/high separately
    const forecastForAgg = forecastDaily.map((f) => ({
      date: f.date,
      predicted: f.predicted,
      low: f.low,
      high: f.high,
    }));

    let forecastAggregated: Array<{
      date: string;
      predicted: number;
      low: number;
      high: number;
    }>;

    if (granularity === "day") {
      forecastAggregated = forecastForAgg;
    } else {
      // Aggregate each field
      const predAgg = aggregateToGranularity(
        forecastForAgg.map((f) => ({ date: f.date, value: f.predicted })),
        granularity
      );
      const lowAgg = aggregateToGranularity(
        forecastForAgg.map((f) => ({ date: f.date, value: f.low })),
        granularity
      );
      const highAgg = aggregateToGranularity(
        forecastForAgg.map((f) => ({ date: f.date, value: f.high })),
        granularity
      );

      forecastAggregated = predAgg.map((p, i) => ({
        date: p.date,
        predicted: p.value,
        low: lowAgg[i]?.value ?? 0,
        high: highAgg[i]?.value ?? 0,
      }));
    }

    const responseBody = {
      historical: historicalAggregated,
      forecast: forecastAggregated,
      summary: {
        current_monthly_run_rate: currentMonthlyRunRate,
        projected_next_month: next30Forecast,
        projected_next_quarter: next90Forecast,
        growth_rate_pct: growthRatePct,
        confidence,
      },
      scenarios: {
        current_trend: {
          monthly: currentTrendMonthly,
          quarterly: currentTrendQuarterly,
        },
        if_traffic_doubles: {
          monthly: trafficDoublesMonthly,
          quarterly: trafficDoublesQuarterly,
        },
        if_switch_to_cheaper_model: cheaperModelScenario,
      },
    };

    res.json({ data: responseBody, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/forecast:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
