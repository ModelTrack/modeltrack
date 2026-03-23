import { useApi } from '../hooks/useApi';
import TeamBreakdown from '../components/TeamBreakdown';
import type { TeamRow, SegmentSpend } from '../types';
import { formatCurrency, formatNumber } from '../lib/format';

interface ApiTeamRow {
  team: string;
  total_spend: number;
  request_count: number;
  by_model: Record<string, number>;
  by_app: Record<string, number>;
}

interface SegmentRow extends SegmentSpend {
  by_model: Array<{ model: string; spend: number; request_count: number }>;
}

export default function Teams() {
  const { data: raw, loading, error } = useApi<ApiTeamRow[]>('/api/teams');
  const { data: segments } = useApi<SegmentRow[]>('/api/segments');

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
  const teams: TeamRow[] = raw.map((t) => ({
    team: t.team,
    total_cost: t.total_spend,
    requests: t.request_count,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Teams</h2>

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
              {raw.map((team) => (
                <tr
                  key={team.team}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {team.team}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatNumber(team.request_count)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {Object.keys(team.by_app).length}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {formatCurrency(team.total_spend)}
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
                      <td className="px-4 py-3 text-gray-300">
                        {formatNumber(seg.request_count)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCurrency(seg.avg_cost_per_request)}
                      </td>
                      <td className="px-4 py-3 text-emerald-400">
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
    </div>
  );
}
