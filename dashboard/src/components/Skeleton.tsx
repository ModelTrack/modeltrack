import Card from './Card';

export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="h-3 w-24 bg-gray-800 rounded mb-3" />
      <div className="h-7 w-32 bg-gray-800 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-800 rounded" />
    </Card>
  );
}

export function SkeletonChart() {
  return (
    <Card className="animate-pulse">
      <div className="h-5 w-48 bg-gray-800 rounded mb-4" />
      <div className="h-[300px] flex items-end gap-1 px-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-800 rounded-t"
            style={{
              height: `${30 + Math.sin(i * 0.7) * 25 + ((i * 13) % 20)}%`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-gray-800/50 animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-28 bg-gray-800 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-gray-800 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-gray-800 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-gray-800 rounded" />
      </td>
    </tr>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <Card className="overflow-hidden animate-pulse" padding="sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-800">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div
                    className="h-3 bg-gray-800 rounded"
                    style={{ width: `${50 + i * 15}px` }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                {Array.from({ length: columns }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div
                      className="h-4 bg-gray-800 rounded"
                      style={{ width: `${40 + ((i + j) % 3) * 20}px` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
