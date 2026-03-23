import { useState, useRef, useEffect } from 'react';

export interface Filter {
  field: string;
  value: string;
}

interface FilterPillsProps {
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
}

const FIELD_OPTIONS = ['Team', 'Model', 'App', 'Feature', 'Provider'];

export default function FilterPills({ filters, onChange }: FilterPillsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [field, setField] = useState(FIELD_OPTIONS[0]);
  const [value, setValue] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAdd(false);
      }
    }
    if (showAdd) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdd]);

  const handleRemove = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    if (!value.trim()) return;
    onChange([...filters, { field, value: value.trim() }]);
    setValue('');
    setShowAdd(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f, i) => (
        <span
          key={`${f.field}-${f.value}-${i}`}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700"
        >
          <span className="text-gray-500">{f.field}:</span>
          <span>{f.value}</span>
          <button
            onClick={() => handleRemove(i)}
            className="ml-0.5 text-gray-500 hover:text-gray-200 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}

      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-800/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700/50 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add filter
        </button>

        {showAdd && (
          <div className="absolute left-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[220px] space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Field</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-emerald-500"
              >
                {FIELD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Value</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                placeholder={`Enter ${field.toLowerCase()}...`}
                className="w-full px-2 py-1.5 text-sm rounded-md bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={!value.trim()}
              className="w-full px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
