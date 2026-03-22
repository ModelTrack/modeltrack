import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../lib/format';

export interface TeamRow {
  team: string;
  total_cost: number;
  requests: number;
}

interface TeamBreakdownProps {
  data: TeamRow[];
}

export default function TeamBreakdown({ data }: TeamBreakdownProps) {
  const sorted = [...data].sort((a, b) => b.total_cost - a.total_cost);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        Spend by Team
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            type="number"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="team"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            width={100}
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
          <Bar dataKey="total_cost" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
