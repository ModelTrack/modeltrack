import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../lib/format';

interface SpendChartProps {
  data: { date: string; cost: number }[];
  title: string;
}

export default function SpendChart({ data, title }: SpendChartProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h3 className="text-lg font-medium text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
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
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            fill="url(#costGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
