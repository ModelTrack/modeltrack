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
import ModelTable, { ModelRow } from '../components/ModelTable';
import { formatCurrency } from '../lib/format';

interface ModelsData {
  models: ModelRow[];
}

export default function Models() {
  const { data, loading, error } = useApi<ModelsData>('/api/models');

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

  const chartData = [...data.models]
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Models</h2>

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
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="total_cost" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ModelTable data={data.models} />
    </div>
  );
}
