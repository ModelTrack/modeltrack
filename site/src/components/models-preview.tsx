'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useAnimatedNumber, useMounted } from '@/lib/hooks';
import { CHART_COLORS } from '@/lib/colors';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const MODEL_DATA = [
  { name: 'Claude Opus', pct: 38, color: CHART_COLORS[0] },
  { name: 'Claude Sonnet', pct: 35, color: CHART_COLORS[1] },
  { name: 'GPT-4o', pct: 15, color: CHART_COLORS[2] },
  { name: 'GPT-4.1', pct: 7, color: CHART_COLORS[3] },
  { name: 'Others', pct: 5, color: CHART_COLORS[4] },
];

const SUMMARY = [
  { label: 'Total Models', value: 6, format: 'number' },
  { label: 'Total Requests', value: 60000, format: 'short' },
  { label: 'Total Tokens', value: 151200000, format: 'short' },
  { label: 'Total Cost', value: 933.94, format: 'currency' },
];

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function AnimatedMetric({
  label,
  target,
  format,
}: {
  label: string;
  target: number;
  format: string;
}) {
  const animated = useAnimatedNumber(target);

  let display: string;
  if (format === 'currency') {
    display = `$${animated.toFixed(2)}`;
  } else if (format === 'short') {
    display = formatShort(animated);
  } else {
    display = Math.round(animated).toString();
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold font-mono tabular-nums text-blue-400">
        {display}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-[11px] text-[#a3a3a3]">{entry.name}</span>
      </div>
      <div className="text-sm font-mono tabular-nums text-blue-400 font-semibold">
        {entry.value}%
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ModelsPreview() {
  const mounted = useMounted();

  return (
    <div className="relative rounded-xl border border-[#1a1a1a] overflow-hidden bg-[#0a0a0a] shadow-xl shadow-blue-500/5 max-w-[560px]">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-white">Models</h3>
          <p className="text-[10px] text-[#525252]">
            Cost distribution across AI models
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2">
          {SUMMARY.map((item) => (
            <AnimatedMetric
              key={item.label}
              label={item.label}
              target={item.value}
              format={item.format}
            />
          ))}
        </div>

        {/* Donut Chart */}
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors">
          <div className="text-[10px] uppercase tracking-wider text-[#525252] mb-2">
            Cost by Model
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[200px] w-[200px] flex-shrink-0">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={MODEL_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="pct"
                      nameKey="name"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {MODEL_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend */}
            <div className="space-y-2 flex-1 min-w-0">
              {MODEL_DATA.map((model) => (
                <div key={model.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-[11px] text-[#a3a3a3] truncate flex-1">
                    {model.name}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-blue-400 font-medium flex-shrink-0">
                    {model.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
