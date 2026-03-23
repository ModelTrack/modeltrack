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
import ModelTable from '../components/ModelTable';
import SlideOver from '../components/SlideOver';
import type { ModelRow } from '../types';
import { formatCurrency, formatNumber, formatTokens } from '../lib/format';
import { chartTooltipStyle } from '../lib/chartTheme';
import FilterPills, { type Filter } from '../components/FilterPills';

interface ApiModelRow {
  model: string;
  provider: string;
  total_spend: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  avg_cost_per_request: number;
  request_count: number;
}

export default function Models() {
  const { data: raw, loading, error } = useApi<ApiModelRow[]>('/api/models');
  const [selectedModel, setSelectedModel] = useState<ModelRow | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);

  if (loading && !raw) {
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

  if (!raw) return null;

  // Map API shape to ModelRow
  const allModels: ModelRow[] = raw.map((r) => ({
    model: r.model,
    requests: r.request_count,
    input_tokens: r.total_input_tokens,
    output_tokens: r.total_output_tokens,
    total_cost: r.total_spend,
    avg_cost_per_request: r.avg_cost_per_request,
  }));

  // Client-side filtering
  const models = allModels.filter((m) =>
    filters.every((f) => {
      const fieldLower = f.field.toLowerCase();
      const valLower = f.value.toLowerCase();
      if (fieldLower === 'model') return m.model.toLowerCase().includes(valLower);
      return true;
    }),
  );

  const chartData = [...models]
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Models</h2>

      <FilterPills filters={filters} onChange={setFilters} />

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-medium text-gray-100 mb-4">
          Cost Distribution by Model
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="model"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              cursor={false}
              contentStyle={chartTooltipStyle.contentStyle}
              labelStyle={chartTooltipStyle.labelStyle}
              itemStyle={chartTooltipStyle.itemStyle}
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
            />
            <Bar dataKey="total_cost" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ModelTable data={models} onRowClick={(row) => setSelectedModel(row)} />

      <SlideOver
        open={selectedModel !== null}
        onClose={() => setSelectedModel(null)}
        title={selectedModel?.model ?? ''}
      >
        {selectedModel && <ModelDetail model={selectedModel} />}
      </SlideOver>
    </div>
  );
}

function ModelDetail({ model }: { model: ModelRow }) {
  const totalTokens = model.input_tokens + model.output_tokens;
  const inputPct = totalTokens > 0 ? (model.input_tokens / totalTokens) * 100 : 50;
  const outputPct = totalTokens > 0 ? (model.output_tokens / totalTokens) * 100 : 50;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-100 mb-1">{model.model}</h3>
        <p className="text-sm text-gray-400">Model details</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Cost</p>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(model.total_cost)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Requests</p>
          <p className="text-lg font-semibold text-gray-100 tabular-nums">
            {formatNumber(model.requests)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Avg Cost / Request</p>
          <p className="text-lg font-semibold text-gray-100 tabular-nums">
            {formatCurrency(model.avg_cost_per_request)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Tokens</p>
          <p className="text-lg font-semibold text-gray-100 tabular-nums">
            {formatTokens(model.input_tokens + model.output_tokens)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-400 mb-2">Token Breakdown</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${inputPct}%` }}
          />
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${outputPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Input: {formatTokens(model.input_tokens)} ({inputPct.toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Output: {formatTokens(model.output_tokens)} ({outputPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
