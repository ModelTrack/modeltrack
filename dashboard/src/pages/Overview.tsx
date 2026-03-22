import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import SpendChart from '../components/SpendChart';
import ModelTable, { ModelRow } from '../components/ModelTable';
import TeamBreakdown, { TeamRow } from '../components/TeamBreakdown';
import { formatCurrency, formatNumber } from '../lib/format';

interface OverviewData {
  spend_today: number;
  spend_this_month: number;
  total_requests: number;
  avg_cost_per_request: number;
  daily_spend: { date: string; cost: number }[];
  top_models: ModelRow[];
  teams: TeamRow[];
  trends?: {
    spend_today: { direction: 'up' | 'down'; percentage: number };
    spend_this_month: { direction: 'up' | 'down'; percentage: number };
    total_requests: { direction: 'up' | 'down'; percentage: number };
  };
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Spend Today"
          value={formatCurrency(data.spend_today)}
          trend={data.trends?.spend_today}
        />
        <MetricCard
          label="This Month"
          value={formatCurrency(data.spend_this_month)}
          trend={data.trends?.spend_this_month}
        />
        <MetricCard
          label="Total Requests"
          value={formatNumber(data.total_requests)}
          trend={data.trends?.total_requests}
        />
        <MetricCard
          label="Avg Cost/Request"
          value={formatCurrency(data.avg_cost_per_request)}
        />
      </div>

      <SpendChart data={data.daily_spend} title="30-Day Spend Trend" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-100 mb-3">
            Top Models
          </h3>
          <ModelTable data={data.top_models} />
        </div>
        <TeamBreakdown data={data.teams} />
      </div>
    </div>
  );
}
