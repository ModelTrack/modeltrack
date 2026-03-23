import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';

type Page =
  | 'overview'
  | 'models'
  | 'features'
  | 'prompts'
  | 'teams'
  | 'sessions'
  | 'reports'
  | 'forecast'
  | 'estimator'
  | 'infrastructure'
  | 'alerts';

interface CommandPaletteProps {
  onNavigate: (page: Page) => void;
}

const pages: { key: Page; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'models', label: 'Models' },
  { key: 'features', label: 'Features' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'teams', label: 'Teams' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'reports', label: 'Reports' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'estimator', label: 'Estimator' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'alerts', label: 'Alerts' },
];

const quickActions = [
  { label: 'Go to budgets', action: 'budgets' },
  { label: 'View cache stats', action: 'cache' },
  { label: 'Export report (CSV)', action: 'export' },
];

const timeRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month', value: 'month' },
  { label: 'This quarter', value: 'quarter' },
];

export default function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function selectPage(page: Page) {
    onNavigate(page);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative z-10 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              label="Command palette"
            >
              <div className="flex items-center gap-2 px-4 border-b border-gray-800">
                <svg
                  className="w-4 h-4 text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <Command.Input
                  placeholder="Search pages, actions..."
                  className="w-full py-3 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
                />
              </div>
              <Command.List className="max-h-72 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-gray-500">
                  No results found
                </Command.Empty>

                <Command.Group
                  heading="Pages"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500"
                >
                  {pages.map((p) => (
                    <Command.Item
                      key={p.key}
                      value={p.label}
                      onSelect={() => selectPage(p.key)}
                      className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-300 cursor-pointer data-[selected=true]:bg-gray-800 data-[selected=true]:text-gray-100"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                      {p.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Quick Actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500"
                >
                  {quickActions.map((a) => (
                    <Command.Item
                      key={a.action}
                      value={a.label}
                      onSelect={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-300 cursor-pointer data-[selected=true]:bg-gray-800 data-[selected=true]:text-gray-100"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="13 17 18 12 13 7" />
                        <polyline points="6 17 11 12 6 7" />
                      </svg>
                      {a.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Time Ranges"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500"
                >
                  {timeRanges.map((t) => (
                    <Command.Item
                      key={t.value}
                      value={t.label}
                      onSelect={() => setOpen(false)}
                      className="flex items-center justify-between px-2 py-2 rounded-md text-sm text-gray-300 cursor-pointer data-[selected=true]:bg-gray-800 data-[selected=true]:text-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-500 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {t.label}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
