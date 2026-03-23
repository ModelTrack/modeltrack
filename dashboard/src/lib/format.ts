export function formatCurrency(value: number): string {
  if (value < 0) return '-' + formatCurrency(-value);
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  if (value >= 0.01) {
    return `$${value.toFixed(3)}`;
  }
  if (value === 0) {
    return '$0.00';
  }
  return `$${value.toFixed(4)}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return n.toLocaleString();
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return n.toLocaleString();
}

export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}
