import { useState } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import Overview from './pages/Overview';
import Models from './pages/Models';
import Features from './pages/Features';
import Prompts from './pages/Prompts';
import Teams from './pages/Teams';
import Sessions from './pages/Sessions';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Estimator from './pages/Estimator';
import Forecast from './pages/Forecast';
import Infrastructure from './pages/Infrastructure';
import CommandPalette from './components/CommandPalette';

export type Page =
  | 'overview'
  | 'models'
  | 'features'
  | 'prompts'
  | 'teams'
  | 'sessions'
  | 'reports'
  | 'forecast'
  | 'alerts'
  | 'estimator'
  | 'infrastructure';

const navItems: { key: Page; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'models', label: 'Models' },
  { key: 'features', label: 'Features' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'teams', label: 'Teams' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'reports', label: 'Reports' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'estimator', label: 'Estimator' },
  { key: 'infrastructure', label: 'Infrastructure' },
];

function PageContent({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  switch (page) {
    case 'overview':
      return <Overview setPage={setPage} />;
    case 'models':
      return <Models />;
    case 'features':
      return <Features />;
    case 'prompts':
      return <Prompts />;
    case 'teams':
      return <Teams />;
    case 'sessions':
      return <Sessions />;
    case 'reports':
      return <Reports />;
    case 'forecast':
      return <Forecast />;
    case 'alerts':
      return <Alerts />;
    case 'estimator':
      return <Estimator />;
    case 'infrastructure':
      return <Infrastructure />;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('overview');

  return (
    <RadixTooltip.Provider delayDuration={200}>
      <div className="flex h-screen bg-gray-950 text-gray-100">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-gray-800 flex flex-col">
          <div className="px-5 py-5 border-b border-gray-800">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-emerald-400">Cost</span>Track
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">AI FinOps Platform</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  page === item.key
                    ? 'bg-gray-800 text-gray-100'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-5 py-3 border-t border-gray-800">
            <kbd className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-800/60 border border-gray-700 rounded px-1.5 py-0.5">
              <span className="text-[10px]">&#8984;</span>K
            </kbd>
            <span className="text-xs text-gray-500 ml-1.5">Search</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <PageContent page={page} setPage={setPage} />
            </motion.div>
          </AnimatePresence>
        </main>

        <CommandPalette onNavigate={setPage} />
      </div>
    </RadixTooltip.Provider>
  );
}
