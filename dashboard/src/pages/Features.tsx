import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import type { FeatureUsage } from '../types';
import { formatCurrency, formatNumber, formatTokens } from '../lib/format';
import { chartTooltipStyle } from '../lib/chartTheme';

type SortKey = keyof FeatureUsage;

export default function Features() {
  const { data: features, loading, error } = useApi<FeatureUsage[]>('/api/features');
  const [sortKey, setSortKey] = useState<SortKey>('total_cost');
  const [sortAsc, setSortAsc] = useState(false);

  if (loading && !features) {
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

  if (!features) return null;

  const chartData = [...features]
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10);

  const sorted = [...features].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'feature', label: 'Feature' },
    { key: 'request_count', label: 'Requests' },
    { key: 'avg_cost_per_request', label: 'Avg Cost/Req' },
    { key: 'total_input_tokens', label: 'Input Tokens' },
    { key: 'total_output_tokens', label: 'Output Tokens' },
    { key: 'total_cost', label: 'Total Cost' },
    { key: 'primary_model', label: 'Primary Model' },
  ];

  const indicator = (key: SortKey) => {
    if (key !== sortKey) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">Features</h2>
        <p className="text-sm text-gray-500 mt-1">Cost per AI feature</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-medium text-gray-100 mb-4">
          Top Features by Cost
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              type="number"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="feature"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              width={150}
            />
            <Tooltip
              cursor={false}
              contentStyle={chartTooltipStyle.contentStyle}
              labelStyle={chartTooltipStyle.labelStyle}
              itemStyle={chartTooltipStyle.itemStyle}
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
            />
            <Bar dataKey="total_cost" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 font-medium cursor-pointer hover:text-gray-200 select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {indicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {row.feature}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatNumber(row.request_count)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatCurrency(row.avg_cost_per_request)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatTokens(row.total_input_tokens)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatTokens(row.total_output_tokens)}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {formatCurrency(row.total_cost)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {row.primary_model}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
