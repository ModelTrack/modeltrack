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
import { chartTooltipStyle } from '../lib/chartTheme';
import { colors } from '../lib/colors';
import Card from './Card';

interface SpendChartProps {
  data: { date: string; cost: number }[];
  title: string;
}

export default function SpendChart({ data, title }: SpendChartProps) {
  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.chart.primary} stopOpacity={0.4} />
              <stop offset="50%" stopColor={colors.chart.primary} stopOpacity={0.15} />
              <stop offset="100%" stopColor={colors.chart.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="date"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 12 }}
          />
          <YAxis
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 12 }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <Tooltip
            cursor={{ stroke: '#4b5563', strokeDasharray: '3 3' }}
            contentStyle={chartTooltipStyle.contentStyle}
            labelStyle={chartTooltipStyle.labelStyle}
            itemStyle={chartTooltipStyle.itemStyle}
            formatter={(value: number) => [formatCurrency(value), 'Cost']}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke={colors.chart.primary}
            fill="url(#costGradient)"
            strokeWidth={2}
            activeDot={{ r: 4, fill: colors.chart.primary, stroke: '#065f46', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
