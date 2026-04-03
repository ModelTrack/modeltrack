'use client';

import { useAnimatedNumber, useMounted } from '@/lib/hooks';
import { CHART_COLORS } from '@/lib/colors';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  LayoutDashboard,
  Box,
  Layers,
  Users,
  Activity,
  TrendingUp,
  Calculator,
  FileText,
  Bell,
  Settings,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_DATA = {
  totalSpend: 29600,
  spendToday: 1245,
  avgDaily: 987,
  topModel: 'Claude Sonnet 4.6',
  topModelSpend: 12450,
  topTeam: 'Engineering',
  topTeamSpend: 14850,

  spendTrend: [
    { day: 'Mar 1', spend: 850 },
    { day: 'Mar 2', spend: 920 },
    { day: 'Mar 3', spend: 780 },
    { day: 'Mar 4', spend: 650 },
    { day: 'Mar 5', spend: 870 },
    { day: 'Mar 6', spend: 950 },
    { day: 'Mar 7', spend: 1020 },
    { day: 'Mar 8', spend: 380 },
    { day: 'Mar 9', spend: 290 },
    { day: 'Mar 10', spend: 1050 },
    { day: 'Mar 11', spend: 980 },
    { day: 'Mar 12', spend: 1100 },
    { day: 'Mar 13', spend: 1150 },
    { day: 'Mar 14', spend: 1080 },
    { day: 'Mar 15', spend: 420 },
    { day: 'Mar 16', spend: 350 },
    { day: 'Mar 17', spend: 1200 },
    { day: 'Mar 18', spend: 1150 },
    { day: 'Mar 19', spend: 1250 },
    { day: 'Mar 20', spend: 1180 },
    { day: 'Mar 21', spend: 1300 },
    { day: 'Mar 22', spend: 480 },
    { day: 'Mar 23', spend: 390 },
    { day: 'Mar 24', spend: 1350 },
    { day: 'Mar 25', spend: 1280 },
    { day: 'Mar 26', spend: 1400 },
    { day: 'Mar 27', spend: 1320 },
    { day: 'Mar 28', spend: 1450 },
    { day: 'Mar 29', spend: 510 },
    { day: 'Mar 30', spend: 1380 },
  ],

  topModels: [
    { name: 'Claude Sonnet 4.6', spend: 12450, pct: 42 },
    { name: 'GPT-4o', spend: 5920, pct: 20 },
    { name: 'Claude Haiku 4.5', spend: 4140, pct: 14 },
    { name: 'GPT-4.1', spend: 3550, pct: 12 },
    { name: 'Claude Opus 4.6', spend: 3540, pct: 12 },
  ],

  topTeams: [
    { name: 'Engineering', spend: 14850, members: 24 },
    { name: 'Product', spend: 7240, members: 12 },
    { name: 'Data Science', spend: 4320, members: 8 },
    { name: 'Support', spend: 2190, members: 15 },
    { name: 'Marketing', spend: 1000, members: 6 },
  ],
};


/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <span className={className}>
      ${animated.toLocaleString()}
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  isCurrency = false,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-1">
        {label}
      </div>
      {isCurrency && typeof value === 'number' ? (
        <AnimatedCurrency
          value={value}
          className="text-lg font-semibold font-mono tabular-nums text-blue-400"
        />
      ) : (
        <div className="text-lg font-semibold font-mono tabular-nums text-blue-400 truncate">
          {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
        </div>
      )}
      {subtitle && (
        <div className="text-[10px] text-[#525252] mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

const sidebarGroups = [
  {
    label: 'MONITOR',
    items: [
      { icon: LayoutDashboard, label: 'Overview', active: true },
      { icon: Box, label: 'Models', active: false },
      { icon: Layers, label: 'Features', active: false },
      { icon: Users, label: 'Teams', active: false },
      { icon: Activity, label: 'Sessions', active: false },
    ],
  },
  {
    label: 'PLAN',
    items: [
      { icon: TrendingUp, label: 'Forecast', active: false },
      { icon: Calculator, label: 'Estimator', active: false },
      { icon: FileText, label: 'Reports', active: false },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { icon: Bell, label: 'Alerts', active: false },
      { icon: Settings, label: 'Settings', active: false },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Custom Chart Tooltip                                               */
/* ------------------------------------------------------------------ */

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[11px] text-[#a3a3a3] mb-0.5">{label}</div>
      <div className="text-sm font-mono tabular-nums text-blue-400 font-semibold">
        ${payload[0].value.toLocaleString()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPreview() {
  const mounted = useMounted();

  return (
    <div className="relative rounded-xl border border-[#1a1a1a] overflow-hidden bg-[#0a0a0a] shadow-2xl shadow-blue-500/5 max-w-[900px] mx-auto">
      <div className="flex">
        {/* Mini Sidebar */}
        <div className="w-44 border-r border-[#1a1a1a] p-3 flex flex-col gap-1 shrink-0">
          <div className="text-sm font-bold mb-4 px-2">
            <span className="text-blue-500">Model</span>
            <span className="text-white">Track</span>
          </div>
          {sidebarGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#525252] px-2 mb-1 font-medium">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${
                      item.active
                        ? 'bg-[#141414] text-blue-500 border-l-2 border-blue-400'
                        : 'text-[#a3a3a3]'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 min-w-0 space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-sm font-semibold text-white">Overview</h3>
            <p className="text-[10px] text-[#525252]">
              AI usage and spending summary
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-5 gap-2">
            <MetricCard
              label="Total Spend"
              value={MOCK_DATA.totalSpend}
              subtitle="Last 30 days"
              isCurrency

            />
            <MetricCard
              label="Spend Today"
              value={MOCK_DATA.spendToday}
              subtitle="+12.3% vs yesterday"
              isCurrency

            />
            <MetricCard
              label="Avg Daily"
              value={MOCK_DATA.avgDaily}
              subtitle="30-day average"
              isCurrency

            />
            <MetricCard
              label="Top Model"
              value={MOCK_DATA.topModel}
              subtitle={`$${MOCK_DATA.topModelSpend.toLocaleString()} spent`}

            />
            <MetricCard
              label="Top Team"
              value={MOCK_DATA.topTeam}
              subtitle={`$${MOCK_DATA.topTeamSpend.toLocaleString()} spent`}

            />
          </div>

          {/* Chart */}
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
            <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-2">
              30-Day Spend Trend
            </div>
            <div className="h-[160px]">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_DATA.spendTrend}>
                    <defs>
                      <linearGradient
                        id="spendGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3B82F6"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3B82F6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke="#262626"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 9, fill: '#525252', fontFamily: 'var(--font-geist-mono, monospace)' }}
                      axisLine={false}
                      tickLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#525252', fontFamily: 'var(--font-geist-mono, monospace)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#spendGradient)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: '#3B82F6',
                        stroke: '#0a0a0a',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom: Top Models + Top Teams */}
          <div className="grid grid-cols-2 gap-2">
            {/* Top Models by Spend */}
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
              <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-3">
                Top Models by Spend
              </div>
              <div className="space-y-2.5">
                {MOCK_DATA.topModels.map((model, idx) => {
                  const color = CHART_COLORS[idx];
                  return (
                    <div key={model.name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-white truncate">
                              {model.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <span className="text-[9px] text-[#525252]">
                                {model.pct}%
                              </span>
                              <span className="text-[11px] font-mono tabular-nums font-medium text-blue-400">
                                ${model.spend.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div
                            className="h-1 rounded-full mt-1"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: mounted ? `${model.pct}%` : '0%',
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Teams by Spend */}
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
              <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-3">
                Top Teams by Spend
              </div>
              <div className="space-y-2.5">
                {MOCK_DATA.topTeams.map((team, idx) => {
                  const color = CHART_COLORS[idx];
                  const perMember =
                    team.members > 0
                      ? Math.round(team.spend / team.members)
                      : 0;
                  return (
                    <div key={team.name} className="flex items-center gap-2">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-white truncate block">
                              {team.name}
                            </span>
                            <span className="text-[9px] text-[#525252]">
                              {team.members} members
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-[11px] font-mono tabular-nums font-medium text-blue-400 block">
                              ${team.spend.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-mono tabular-nums text-[#525252]">
                              ${perMember.toLocaleString()}/member
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
