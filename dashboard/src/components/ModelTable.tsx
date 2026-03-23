import { useState } from 'react';
import { formatCurrency, formatNumber, formatTokens } from '../lib/format';
import type { ModelRow } from '../types';

type SortKey = keyof ModelRow;

interface ModelTableProps {
  data: ModelRow[];
  onRowClick?: (row: ModelRow) => void;
}

export default function ModelTable({ data, onRowClick }: ModelTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_cost');
  const [sortAsc, setSortAsc] = useState(false);

  const maxCost = data.length > 0 ? Math.max(...data.map((d) => d.total_cost)) : 1;

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'model', label: 'Model' },
    { key: 'requests', label: 'Requests' },
    { key: 'input_tokens', label: 'Input Tokens' },
    { key: 'output_tokens', label: 'Output Tokens' },
    { key: 'total_cost', label: 'Total Cost' },
    { key: 'avg_cost_per_request', label: 'Avg Cost/Req' },
  ];

  const indicator = (key: SortKey) => {
    if (key !== sortKey) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-medium cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {indicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.model}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                <td className="px-4 py-3 font-medium text-gray-100">
                  {row.model}
                </td>
                <td className="px-4 py-3 text-gray-300 tabular-nums">
                  {formatNumber(row.requests)}
                </td>
                <td className="px-4 py-3 text-gray-300 tabular-nums">
                  {formatTokens(row.input_tokens)}
                </td>
                <td className="px-4 py-3 text-gray-300 tabular-nums">
                  {formatTokens(row.output_tokens)}
                </td>
                <td className="px-4 py-3 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/10"
                    style={{ width: `${(row.total_cost / maxCost) * 100}%` }}
                  />
                  <span className="relative text-emerald-400 tabular-nums">{formatCurrency(row.total_cost)}</span>
                </td>
                <td className="px-4 py-3 text-gray-300 tabular-nums">
                  {formatCurrency(row.avg_cost_per_request)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
