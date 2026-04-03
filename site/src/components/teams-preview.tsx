'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useMounted } from '@/lib/hooks';
import { CHART_COLORS } from '@/lib/colors';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const TEAM_DATA = [
  { name: 'Engineering', spend: 14850, requests: '32.1k' },
  { name: 'Product', spend: 7240, requests: '15.8k' },
  { name: 'Data Science', spend: 4320, requests: '8.2k' },
  { name: 'Support', spend: 2190, requests: '3.1k' },
  { name: 'Marketing', spend: 1000, requests: '0.8k' },
];


/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function BarTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[11px] text-[#a3a3a3] mb-0.5">
        {entry.payload.name}
      </div>
      <div className="text-sm font-mono tabular-nums text-blue-400 font-semibold">
        ${entry.value.toLocaleString()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function TeamsPreview() {
  const mounted = useMounted();

  return (
    <div className="relative rounded-xl border border-[#1a1a1a] overflow-hidden bg-[#0a0a0a] shadow-xl shadow-blue-500/5 max-w-[560px]">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-white">Teams</h3>
          <p className="text-[10px] text-[#525252]">
            Spend breakdown by team
          </p>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
          <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-2">
            Team Spend
          </div>
          <div className="h-[200px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={TEAM_DATA}
                  layout="vertical"
                  margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 9,
                      fill: '#525252',
                      fontFamily: 'var(--font-geist-mono, monospace)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: '#a3a3a3',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    content={<BarTooltipContent />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar
                    dataKey="spend"
                    radius={[0, 4, 4, 0]}
                    animationBegin={0}
                    animationDuration={1000}
                  >
                    {TEAM_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Mini Table */}
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#525252]">
                <th className="text-left pb-2 font-medium">Team</th>
                <th className="text-right pb-2 font-medium">Requests</th>
                <th className="text-right pb-2 font-medium">Spend</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_DATA.slice(0, 4).map((team, i) => (
                <tr
                  key={team.name}
                  className="border-t border-[#262626]"
                >
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i] }}
                      />
                      <span className="text-[11px] text-white font-medium">
                        {team.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-right text-[11px] font-mono tabular-nums text-[#a3a3a3] py-1.5">
                    {team.requests}
                  </td>
                  <td className="text-right text-[11px] font-mono tabular-nums text-blue-400 font-medium py-1.5">
                    ${team.spend.toLocaleString()}
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
