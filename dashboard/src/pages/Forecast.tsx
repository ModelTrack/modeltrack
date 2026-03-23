import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import { formatCurrency } from '../lib/format';
import type { ForecastData } from '../types';

type Granularity = 'day' | 'week' | 'month';

const granularityLabels: Record<Granularity, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
};

export default function Forecast() {
  const [horizonDays, setHorizonDays] = useState(90);
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [team, setTeam] = useState('');
  const [model, setModel] = useState('');

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set('horizon_days', String(horizonDays));
    params.set('granularity', granularity);
    if (team) params.set('team', team);
    if (model) params.set('model', model);
    return `/api/forecast?${params.toString()}`;
  }, [horizonDays, granularity, team, model]);

  const { data, loading, error } = useApi<ForecastData>(url);

  // Fetch available teams and models for filter dropdowns
  const { data: teamsData } = useApi<Array<{ team: string; total_spend: number }>>('/api/teams');
  const { data: modelsData } = useApi<Array<{ model: string; total_spend: number }>>('/api/models');

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading forecast...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!data) return null;

  const { summary, scenarios, historical, forecast } = data;

  // Build unified chart data
  const lastHistoricalDate = historical.length > 0 ? historical[historical.length - 1].date : '';

  const chartData = [
    ...historical.map((h) => ({
      date: h.date,
      actual: h.spend,
      predicted: null as number | null,
      low: null as number | null,
      high: null as number | null,
    })),
    // Bridge point: last historical day also starts forecast
    ...(forecast.length > 0 && historical.length > 0
      ? [
          {
            date: lastHistoricalDate,
            actual: historical[historical.length - 1].spend,
            predicted: forecast[0].predicted,
            low: forecast[0].low,
            high: forecast[0].high,
          },
        ]
      : []),
    ...forecast.map((f) => ({
      date: f.date,
      actual: null as number | null,
      predicted: f.predicted,
      low: f.low,
      high: f.high,
    })),
  ];

  // Confidence badge color
  const confidenceColor =
    summary.confidence === 'high'
      ? 'bg-emerald-900/50 text-emerald-300'
      : summary.confidence === 'medium'
      ? 'bg-amber-900/50 text-amber-300'
      : 'bg-red-900/50 text-red-300';

  const growthTrend =
    summary.growth_rate_pct !== 0
      ? {
          direction: summary.growth_rate_pct > 0 ? ('up' as const) : ('down' as const),
          percentage: Math.abs(summary.growth_rate_pct),
        }
      : undefined;

  const horizonLabel =
    horizonDays <= 30 ? '30 days' : horizonDays <= 90 ? 'next quarter' : `${horizonDays} days`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100">Cost Forecast</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Projecting spend for the {horizonLabel} based on 60-day trend
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${confidenceColor}`}>
          {summary.confidence} confidence
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Horizon selector */}
        <div className="flex gap-1">
          {[30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setHorizonDays(d)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                horizonDays === d
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Granularity selector */}
        <div className="flex gap-1">
          {(Object.keys(granularityLabels) as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                granularity === g
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {granularityLabels[g]}
            </button>
          ))}
        </div>

        {/* Team filter */}
        {teamsData && teamsData.length > 0 && (
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Teams</option>
            {teamsData.map((t) => (
              <option key={t.team} value={t.team}>
                {t.team}
              </option>
            ))}
          </select>
        )}

        {/* Model filter */}
        {modelsData && modelsData.length > 0 && (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Models</option>
            {modelsData.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Current Run Rate" value={formatCurrency(summary.current_monthly_run_rate)} />
        <MetricCard label="Projected Next Month" value={formatCurrency(summary.projected_next_month)} />
        <MetricCard
          label="Projected Next Quarter"
          value={formatCurrency(summary.projected_next_quarter)}
        />
        <MetricCard
          label="Monthly Growth Rate"
          value={`${summary.growth_rate_pct >= 0 ? '+' : ''}${summary.growth_rate_pct.toFixed(1)}%`}
          trend={growthTrend}
        />
      </div>

      {/* Main forecast chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Spend Forecast</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ['-', name];
                const labels: Record<string, string> = {
                  actual: 'Actual',
                  predicted: 'Predicted',
                  high: 'High Estimate',
                  low: 'Low Estimate',
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            {/* Confidence interval shaded area */}
            <Area
              type="monotone"
              dataKey="high"
              stroke="none"
              fill="url(#forecastConfidence)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="none"
              fill="#111827"
              connectNulls={false}
            />
            {/* Historical spend */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              fill="url(#historicalGradient)"
              strokeWidth={2}
              connectNulls={false}
            />
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
            />
            {/* Vertical line at boundary */}
            {lastHistoricalDate && (
              <ReferenceLine
                x={lastHistoricalDate}
                stroke="#6b7280"
                strokeDasharray="4 4"
                label={{
                  value: 'Today',
                  position: 'top',
                  fill: '#9ca3af',
                  fontSize: 12,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scenarios */}
      <div>
        <h3 className="text-lg font-medium text-gray-100 mb-4">Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Trend */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Current Trend</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-xl font-semibold text-gray-100">
                  {formatCurrency(scenarios.current_trend.monthly)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quarterly</p>
                <p className="text-xl font-semibold text-gray-100">
                  {formatCurrency(scenarios.current_trend.quarterly)}
                </p>
              </div>
            </div>
          </div>

          {/* If Traffic Doubles */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3">If Traffic Doubles</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-xl font-semibold text-red-400">
                  {formatCurrency(scenarios.if_traffic_doubles.monthly)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quarterly</p>
                <p className="text-xl font-semibold text-red-400">
                  {formatCurrency(scenarios.if_traffic_doubles.quarterly)}
                </p>
              </div>
            </div>
          </div>

          {/* Switch to Cheaper Model */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Switch to Cheaper Model</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-xl font-semibold text-emerald-400">
                  {formatCurrency(scenarios.if_switch_to_cheaper_model.monthly)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quarterly</p>
                <p className="text-xl font-semibold text-emerald-400">
                  {formatCurrency(scenarios.if_switch_to_cheaper_model.quarterly)}
                </p>
              </div>
              {scenarios.if_switch_to_cheaper_model.savings > 0 && (
                <div className="pt-2 border-t border-gray-800">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-900/50 text-emerald-300">
                    Save {formatCurrency(scenarios.if_switch_to_cheaper_model.savings)}/quarter
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {scenarios.if_switch_to_cheaper_model.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
