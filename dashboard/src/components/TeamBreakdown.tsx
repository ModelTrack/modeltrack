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
import { chartTooltipStyle } from '../lib/chartTheme';
import { colors } from '../lib/colors';
import Card from './Card';
import type { TeamRow } from '../types';

interface TeamBreakdownProps {
  data: TeamRow[];
}

export default function TeamBreakdown({ data }: TeamBreakdownProps) {
  const sorted = [...data].sort((a, b) => b.total_cost - a.total_cost);

  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        Spend by Team
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            type="number"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 12 }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="team"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 12 }}
            width={100}
          />
          <Tooltip
            cursor={false}
            contentStyle={chartTooltipStyle.contentStyle}
            labelStyle={chartTooltipStyle.labelStyle}
            itemStyle={chartTooltipStyle.itemStyle}
            formatter={(value: number) => [formatCurrency(value), 'Cost']}
          />
          <Bar dataKey="total_cost" fill={colors.chart.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
