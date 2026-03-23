import { AnimatePresence, motion } from 'framer-motion';
import Tooltip from './Tooltip';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  onClick?: () => void;
  tooltip?: string | ReactNode;
  sparkline?: number[];
}

export default function MetricCard({
  label,
  value,
  trend,
  onClick,
  tooltip,
  sparkline,
}: MetricCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={`bg-gray-900 border border-gray-800 rounded-lg p-5 text-left w-full transition-colors relative ${
        onClick
          ? 'cursor-pointer hover:bg-gray-800/60 hover:border-gray-700'
          : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm text-gray-400">{label}</p>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 hover:text-gray-300 transition-colors cursor-help">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="7" r="6" />
                <path d="M5.5 5.5a1.5 1.5 0 1 1 2.1 1.38c-.42.2-.6.56-.6 1.02V8.5" />
                <circle cx="7" cy="10.5" r="0.5" fill="currentColor" />
              </svg>
            </span>
          </Tooltip>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={value}
              className="text-2xl font-semibold text-gray-100 tabular-nums"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.p>
          </AnimatePresence>
          {trend && (
            <p
              className={`text-sm mt-1 flex items-center gap-1 tabular-nums ${
                trend.direction === 'up' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              <span>{trend.direction === 'up' ? '\u2191' : '\u2193'}</span>
              <span>{trend.percentage.toFixed(1)}%</span>
            </p>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} />
        )}
      </div>
    </Wrapper>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  const width = 60;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="text-emerald-400 shrink-0"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
