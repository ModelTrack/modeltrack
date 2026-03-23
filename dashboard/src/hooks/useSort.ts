import { useState, useMemo } from 'react';

export function useSort<T extends Record<string, unknown>>(
  data: T[],
  defaultKey: keyof T,
  defaultAsc = false
) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortAsc, setSortAsc] = useState(defaultAsc);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: keyof T) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const indicator = (key: keyof T) => {
    if (key !== sortKey) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return { sorted, handleSort, indicator, sortKey, sortAsc };
}
