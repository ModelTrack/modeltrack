import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import TeamBreakdown from '../components/TeamBreakdown';
import SlideOver from '../components/SlideOver';
import type { TeamRow, SegmentSpend } from '../types';
import { formatCurrency, formatNumber } from '../lib/format';
import FilterPills, { type Filter } from '../components/FilterPills';

interface ApiTeamRow {
  team: string;
  total_spend: number;
  request_count: number;
  by_model: Record<string, number>;
  by_app: Record<string, number>;
  budget?: number;
}

interface SegmentRow extends SegmentSpend {
  by_model: Array<{ model: string; spend: number; request_count: number }>;
}

export default function Teams() {
  const { data: raw, loading, error } = useApi<ApiTeamRow[]>('/api/teams');
  const { data: segments } = useApi<SegmentRow[]>('/api/segments');
  const [selectedTeam, setSelectedTeam] = useState<ApiTeamRow | null>(null);
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

  // Map API shape to TeamRow for the chart component
  const allTeams: TeamRow[] = raw.map((t) => ({
    team: t.team,
    total_cost: t.total_spend,
    requests: t.request_count,
  }));

  // Client-side filtering
  const teams = allTeams.filter((t) =>
    filters.every((f) => {
      const fieldLower = f.field.toLowerCase();
      const valLower = f.value.toLowerCase();
      if (fieldLower === 'team') return t.team.toLowerCase().includes(valLower);
      return true;
    }),
  );

  const filteredRaw = raw.filter((t) =>
    filters.every((f) => {
      const fieldLower = f.field.toLowerCase();
      const valLower = f.value.toLowerCase();
      if (fieldLower === 'team') return t.team.toLowerCase().includes(valLower);
      return true;
    }),
  );

  const maxTeamCost = filteredRaw.length > 0 ? Math.max(...filteredRaw.map((t) => t.total_spend)) : 1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Teams</h2>

      <FilterPills filters={filters} onChange={setFilters} />

      <TeamBreakdown data={teams} />

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Apps</th>
                <th className="px-4 py-3 font-medium">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredRaw.map((team) => (
                <tr
                  key={team.team}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setSelectedTeam(team)}
                >
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {team.team}
                  </td>
                  <td className="px-4 py-3 text-gray-300 tabular-nums">
                    {formatNumber(team.request_count)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 tabular-nums">
                    {Object.keys(team.by_app).length}
                  </td>
                  <td className="px-4 py-3 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/10"
                      style={{ width: `${(team.total_spend / maxTeamCost) * 100}%` }}
                    />
                    <span className="relative text-emerald-400 tabular-nums">{formatCurrency(team.total_spend)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {segments && segments.length > 0 && (
        <>
          <h3 className="text-xl font-semibold text-gray-100 mt-8">Spend by Customer Tier</h3>

          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium">Requests</th>
                    <th className="px-4 py-3 font-medium">Avg Cost/Req</th>
                    <th className="px-4 py-3 font-medium">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg) => (
                    <tr
                      key={seg.customer_tier}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-100 capitalize">
                        {seg.customer_tier}
                      </td>
                      <td className="px-4 py-3 text-gray-300 tabular-nums">
                        {formatNumber(seg.request_count)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 tabular-nums">
                        {formatCurrency(seg.avg_cost_per_request)}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 tabular-nums">
                        {formatCurrency(seg.total_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SlideOver
        open={selectedTeam !== null}
        onClose={() => setSelectedTeam(null)}
        title={selectedTeam?.team ?? ''}
      >
        {selectedTeam && <TeamDetail team={selectedTeam} />}
      </SlideOver>
    </div>
  );
}

function TeamDetail({ team }: { team: ApiTeamRow }) {
  const budgetUsedPct =
    team.budget && team.budget > 0
      ? Math.min((team.total_spend / team.budget) * 100, 100)
      : null;

  const modelEntries = Object.entries(team.by_model).sort(
    ([, a], [, b]) => b - a,
  );
  const appEntries = Object.entries(team.by_app).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-100 mb-1">{team.team}</h3>
        <p className="text-sm text-gray-400">Team details</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Cost</p>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(team.total_spend)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Requests</p>
          <p className="text-lg font-semibold text-gray-100 tabular-nums">
            {formatNumber(team.request_count)}
          </p>
        </div>
      </div>

      {budgetUsedPct !== null && team.budget !== undefined && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Budget Status</p>
            <p className="text-sm text-gray-300 tabular-nums">
              {formatCurrency(team.total_spend)} / {formatCurrency(team.budget)}
            </p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${
                budgetUsedPct >= 90
                  ? 'bg-red-500'
                  : budgetUsedPct >= 70
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 tabular-nums">
            {budgetUsedPct.toFixed(1)}% used
          </p>
        </div>
      )}

      {modelEntries.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Model Breakdown</p>
          <div className="space-y-2">
            {modelEntries.map(([model, spend]) => (
              <div
                key={model}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300 truncate mr-2">{model}</span>
                <span className="text-emerald-400 tabular-nums shrink-0">
                  {formatCurrency(spend)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {appEntries.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">App Breakdown</p>
          <div className="space-y-2">
            {appEntries.map(([app, spend]) => (
              <div
                key={app}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300 truncate mr-2">{app}</span>
                <span className="text-emerald-400 tabular-nums shrink-0">
                  {formatCurrency(spend)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
