import { useApi } from '../hooks/useApi';
import TeamBreakdown, { TeamRow } from '../components/TeamBreakdown';
import { formatCurrency, formatNumber } from '../lib/format';

interface TeamsData {
  teams: (TeamRow & { apps: number; avg_cost_per_request: number })[];
}

export default function Teams() {
  const { data, loading, error } = useApi<TeamsData>('/api/teams');

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
      <h2 className="text-2xl font-semibold text-gray-100">Teams</h2>

      <TeamBreakdown data={data.teams} />

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Apps</th>
                <th className="px-4 py-3 font-medium">Total Cost</th>
                <th className="px-4 py-3 font-medium">Avg Cost/Req</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((team) => (
                <tr
                  key={team.team}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {team.team}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatNumber(team.requests)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{team.apps}</td>
                  <td className="px-4 py-3 text-emerald-400">
                    {formatCurrency(team.total_cost)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatCurrency(team.avg_cost_per_request)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
