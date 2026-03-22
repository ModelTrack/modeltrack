import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatNumber } from '../lib/format';
import type { ExecutiveReport } from '../types';

type PeriodPreset = 'this_week' | 'this_month' | 'last_month' | 'this_quarter';

function getPresetParams(preset: PeriodPreset): { period: string; end_date: string } {
  const now = new Date();
  switch (preset) {
    case 'this_week':
      return { period: 'weekly', end_date: now.toISOString().slice(0, 10) };
    case 'this_month':
      return { period: 'monthly', end_date: now.toISOString().slice(0, 10) };
    case 'last_month': {
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { period: 'monthly', end_date: lastDay.toISOString().slice(0, 10) };
    }
    case 'this_quarter':
      return { period: 'quarterly', end_date: now.toISOString().slice(0, 10) };
  }
}

const presetLabels: Record<PeriodPreset, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
};

export default function Reports() {
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const params = useMemo(() => getPresetParams(preset), [preset]);
  const url = `/api/reports/executive?period=${params.period}&end_date=${params.end_date}`;
  const { data, loading, error } = useApi<ExecutiveReport>(url);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
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

  const { summary, trends, spend_by_team, spend_by_model, spend_by_feature, daily_spend, optimization_actions, recommendations } = data;

  // For cost metrics, down is good (green), up is bad (red)
  const spendTrend = trends.spend_change_pct !== 0
    ? { direction: trends.spend_change_pct > 0 ? 'up' as const : 'down' as const, percentage: Math.abs(trends.spend_change_pct) }
    : undefined;

  const requestTrend = trends.request_change_pct !== 0
    ? { direction: trends.request_change_pct > 0 ? 'up' as const : 'down' as const, percentage: Math.abs(trends.request_change_pct) }
    : undefined;

  const efficiencyTrend = trends.cost_efficiency_change_pct !== 0
    ? { direction: trends.cost_efficiency_change_pct > 0 ? 'up' as const : 'down' as const, percentage: Math.abs(trends.cost_efficiency_change_pct) }
    : undefined;

  const chartData = daily_spend.map((d) => ({ date: d.date, cost: d.spend }));

  const teamChartData = spend_by_team.map((t) => ({ team: t.team, total_cost: t.spend }));

  const modelChartData = spend_by_model.map((m) => ({ model: m.model, total_cost: m.spend }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Executive Report</h2>
        <p className="text-sm text-gray-400">{data.period.label}</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {(Object.keys(presetLabels) as PeriodPreset[]).map((key) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              preset === key
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {presetLabels[key]}
          </button>
        ))}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Spend" value={formatCurrency(summary.total_spend)} trend={spendTrend} />
        <MetricCard label="Requests" value={formatNumber(summary.total_requests)} trend={requestTrend} />
        <MetricCard label="Models Used" value={String(summary.unique_models)} />
        <MetricCard label="Teams" value={String(summary.unique_teams)} />
        <MetricCard label="Avg Cost/Req" value={formatCurrency(summary.avg_cost_per_request)} trend={efficiencyTrend} />
        <MetricCard label="Cache Hit Rate" value={`${summary.cache_hit_rate.toFixed(1)}%`} />
      </div>

      {/* Spend trend chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Spend Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="reportCostGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area type="monotone" dataKey="cost" stroke="#10b981" fill="url(#reportCostGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: Team and Model breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Team */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Spend by Team</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, teamChartData.length * 40)}>
            <BarChart data={teamChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="team" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                formatter={(value: number) => [formatCurrency(value), 'Cost']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="total_cost" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spend by Model */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Spend by Model</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, modelChartData.length * 40)}>
            <BarChart data={modelChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="model" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} width={140} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                formatter={(value: number) => [formatCurrency(value), 'Cost']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="total_cost" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Features table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-lg font-medium text-gray-100">Top Features</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Spend</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Avg Cost/Req</th>
              </tr>
            </thead>
            <tbody>
              {spend_by_feature.map((f) => (
                <tr key={f.feature} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-100">{f.feature}</td>
                  <td className="px-4 py-3 text-emerald-400">{formatCurrency(f.spend)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatNumber(f.requests)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(f.avg_cost)}</td>
                </tr>
              ))}
              {spend_by_feature.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No feature data for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimization section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions Taken */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Actions Taken</h3>
          <div className="space-y-3">
            {optimization_actions.length === 0 && (
              <p className="text-sm text-gray-500">No optimization actions recorded for this period.</p>
            )}
            {optimization_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-gray-800/50">
                <span className="shrink-0 mt-0.5 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{action.description}</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-900/50 text-emerald-300">
                  {formatCurrency(action.estimated_savings)} saved
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {recommendations.length === 0 && (
              <p className="text-sm text-gray-500">No recommendations for this period. Looking good!</p>
            )}
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-gray-800/50">
                <span className="shrink-0 mt-0.5 text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </span>
                <p className="text-sm text-gray-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
