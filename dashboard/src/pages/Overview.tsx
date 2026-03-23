import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import SpendChart from '../components/SpendChart';
import { SkeletonCard, SkeletonChart } from '../components/Skeleton';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { formatCurrency, formatNumber } from '../lib/format';
import type { Page } from '../App';

interface OverviewData {
  spend_today: number;
  spend_this_week: number;
  spend_this_month: number;
  total_requests: number;
  top_model: { model: string; spend: number } | null;
  top_team: { team: string; spend: number } | null;
  spend_trend: { day: string; spend: number; requests: number }[];
}

interface OverviewProps {
  setPage: (page: Page) => void;
}

function getDefaultRange(): DateRange {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { label: 'Last 30 days', start: start.toISOString().slice(0, 10), end };
}

export default function Overview({ setPage }: OverviewProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange);
  const url = `/api/overview?start_date=${dateRange.start}&end_date=${dateRange.end}`;
  const { data, error, isFirstLoad } = useApi<OverviewData>(url);

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Error: {error}
      </div>
    );
  }

  if (isFirstLoad) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (!data) return null;

  // Map spend_trend to the shape SpendChart expects ({ date, cost })
  const chartData = (data.spend_trend ?? []).map((d) => ({
    date: d.day,
    cost: d.spend,
  }));

  // Extract sparkline data from spend_trend
  const spendSparkline = (data.spend_trend ?? []).map((d) => d.spend);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Overview</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Spend Today"
          value={formatCurrency(data.spend_today)}
          tooltip="Total AI API spend incurred today (UTC)"
        />
        <MetricCard
          label="This Week"
          value={formatCurrency(data.spend_this_week)}
        />
        <MetricCard
          label="This Month"
          value={formatCurrency(data.spend_this_month)}
          tooltip="Cumulative spend for the current calendar month"
          sparkline={spendSparkline}
        />
        <MetricCard
          label="Total Requests"
          value={formatNumber(data.total_requests)}
          tooltip="Total LLM API calls tracked this month"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.top_model && (
          <MetricCard
            label="Top Model"
            value={`${data.top_model.model} (${formatCurrency(data.top_model.spend)})`}
            onClick={() => setPage('models')}
          />
        )}
        {data.top_team && (
          <MetricCard
            label="Top Team"
            value={`${data.top_team.team} (${formatCurrency(data.top_team.spend)})`}
            onClick={() => setPage('teams')}
          />
        )}
      </div>

      <SpendChart data={chartData} title="30-Day Spend Trend" />
    </div>
  );
}
