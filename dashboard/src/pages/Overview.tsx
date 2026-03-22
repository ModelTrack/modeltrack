import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import SpendChart from '../components/SpendChart';
import { formatCurrency, formatNumber } from '../lib/format';

interface OverviewData {
  spend_today: number;
  spend_this_week: number;
  spend_this_month: number;
  total_requests: number;
  top_model: { model: string; spend: number } | null;
  top_team: { team: string; spend: number } | null;
  spend_trend: { day: string; spend: number; requests: number }[];
}

export default function Overview() {
  const { data, loading, error } = useApi<OverviewData>('/api/overview');

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

  // Map spend_trend to the shape SpendChart expects ({ date, cost })
  const chartData = (data.spend_trend ?? []).map((d) => ({
    date: d.day,
    cost: d.spend,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Spend Today"
          value={formatCurrency(data.spend_today)}
        />
        <MetricCard
          label="This Week"
          value={formatCurrency(data.spend_this_week)}
        />
        <MetricCard
          label="This Month"
          value={formatCurrency(data.spend_this_month)}
        />
        <MetricCard
          label="Total Requests"
          value={formatNumber(data.total_requests)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.top_model && (
          <MetricCard
            label="Top Model"
            value={`${data.top_model.model} (${formatCurrency(data.top_model.spend)})`}
          />
        )}
        {data.top_team && (
          <MetricCard
            label="Top Team"
            value={`${data.top_team.team} (${formatCurrency(data.top_team.spend)})`}
          />
        )}
      </div>

      <SpendChart data={chartData} title="30-Day Spend Trend" />
    </div>
  );
}
