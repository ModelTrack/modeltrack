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
import MetricCard from '../components/MetricCard';
import SpendChart from '../components/SpendChart';
import type { InfrastructureData } from '../types';
import { formatCurrency, formatNumber } from '../lib/format';
import { chartTooltipStyle } from '../lib/chartTheme';

function utilizationColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-400';
  if (pct >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

export default function Infrastructure() {
  const { data, loading, error } = useApi<InfrastructureData>('/api/infrastructure');

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

  const hasData = data.total_infra_cost > 0;
  const gpuCount = data.gpu_utilization.length;
  const avgUtilization =
    gpuCount > 0
      ? data.gpu_utilization.reduce((sum, g) => sum + g.avg_utilization, 0) / gpuCount
      : 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100">Infrastructure</h2>
          <p className="text-sm text-gray-400 mt-1">GPU & cloud service costs</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-300 text-lg mb-2">No infrastructure data yet</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Infrastructure cost tracking is available for AWS services like SageMaker, EC2 GPU instances,
            and Bedrock. Enable the CostTrack infrastructure collector to start tracking these costs.
            Events with <code className="text-gray-400">event_type</code> of{' '}
            <code className="text-gray-400">aws_infrastructure</code> or{' '}
            <code className="text-gray-400">gpu_compute</code> will appear here.
          </p>
        </div>
      </div>
    );
  }

  const serviceChartData = [...data.by_service]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  const teamChartData = [...data.by_team]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">Infrastructure</h2>
        <p className="text-sm text-gray-400 mt-1">GPU & cloud service costs</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Infra Cost" value={formatCurrency(data.total_infra_cost)} />
        <MetricCard label="GPU Instances" value={formatNumber(gpuCount)} />
        <MetricCard
          label="Avg GPU Utilization"
          value={gpuCount > 0 ? `${avgUtilization.toFixed(1)}%` : 'N/A'}
        />
      </div>

      {/* Spend by Service */}
      {serviceChartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Spend by Service</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="service"
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
              <Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spend by Team */}
      {teamChartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Spend by Team</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamChartData} layout="vertical">
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
                width={150}
              />
              <Tooltip
                cursor={false}
                contentStyle={chartTooltipStyle.contentStyle}
                labelStyle={chartTooltipStyle.labelStyle}
                itemStyle={chartTooltipStyle.itemStyle}
                formatter={(value: number) => [formatCurrency(value), 'Cost']}
              />
              <Bar dataKey="cost" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* GPU Utilization Table */}
      {data.gpu_utilization.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-lg font-medium text-gray-100">GPU Utilization</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 font-medium">Resource ID</th>
                  <th className="px-4 py-3 font-medium">GPU Type</th>
                  <th className="px-4 py-3 font-medium">Avg Utilization</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                {data.gpu_utilization.map((gpu) => (
                  <tr
                    key={`${gpu.resource_id}-${gpu.team}`}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3 font-mono text-gray-100">{gpu.resource_id}</td>
                    <td className="px-4 py-3 text-gray-300">{gpu.gpu_type}</td>
                    <td className={`px-4 py-3 font-medium ${utilizationColor(gpu.avg_utilization)}`}>
                      {gpu.avg_utilization.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-emerald-400">{formatCurrency(gpu.cost)}</td>
                    <td className="px-4 py-3 text-gray-300">{gpu.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Spend Trend */}
      {data.daily_trend.length > 0 && (
        <SpendChart data={data.daily_trend} title="Daily Infrastructure Spend" />
      )}
    </div>
  );
}
