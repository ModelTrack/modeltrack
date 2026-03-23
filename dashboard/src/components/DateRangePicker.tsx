import { useState, useRef, useEffect } from 'react';

export interface DateRange {
  label: string;
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresets(): DateRange[] {
  const now = new Date();
  const today = formatISODate(now);

  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return formatISODate(d);
  };

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return [
    { label: 'Last 24h', start: daysAgo(1), end: today },
    { label: 'Last 7 days', start: daysAgo(7), end: today },
    { label: 'Last 30 days', start: daysAgo(30), end: today },
    { label: 'Last 90 days', start: daysAgo(90), end: today },
    { label: 'Month to Date', start: formatISODate(startOfMonth), end: today },
    { label: 'Quarter to Date', start: formatISODate(startOfQuarter), end: today },
    { label: 'Year to Date', start: formatISODate(startOfYear), end: today },
  ];
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const presets = getPresets();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:border-gray-600 transition-colors"
      >
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <span>{value.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 min-w-[180px]">
          <div className="flex flex-col gap-0.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
                className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  value.label === preset.label
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
