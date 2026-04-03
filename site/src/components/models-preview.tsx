'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const MODEL_DATA = [
  { name: 'Claude Opus', pct: 38, color: '#3B82F6' },
  { name: 'Claude Sonnet', pct: 35, color: '#6366F1' },
  { name: 'GPT-4o', pct: 15, color: '#EF4444' },
  { name: 'GPT-4.1', pct: 7, color: '#F59E0B' },
  { name: 'Others', pct: 5, color: '#22C55E' },
];

const SUMMARY = [
  { label: 'Total Models', value: 6, format: 'number' },
  { label: 'Total Requests', value: 60000, format: 'short' },
  { label: 'Total Tokens', value: 151200000, format: 'short' },
  { label: 'Total Cost', value: 933.94, format: 'currency' },
];

/* ------------------------------------------------------------------ */
/*  Animated number hook                                               */
/* ------------------------------------------------------------------ */

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function AnimatedMetric({
  label,
  target,
  format,
  delay = 0,
}: {
  label: string;
  target: number;
  format: string;
  delay?: number;
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
    <div
      className="bg-[#141414] border border-[#262626] rounded-lg p-3 hover:border-[#333] transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          {SUMMARY.map((item, i) => (
            <AnimatedMetric
              key={item.label}
              label={item.label}
              target={item.value}
              format={item.format}
              delay={i * 100}
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
