interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
}

export default function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-100">{value}</p>
      {trend && (
        <p
          className={`text-sm mt-1 flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          <span>{trend.direction === 'up' ? '\u2191' : '\u2193'}</span>
          <span>{trend.percentage.toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}
