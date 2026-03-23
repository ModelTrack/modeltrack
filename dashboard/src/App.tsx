import { useEffect, useState } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  MessageSquare,
  Users,
  Activity,
  TrendingUp,
  Calculator,
  FileText,
  Bell,
  Server,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Overview from './pages/Overview';
import ErrorBoundary from './components/ErrorBoundary';
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

export interface NavItem {
  key: Page;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard },
      { key: 'models', label: 'Models', icon: Cpu },
      { key: 'features', label: 'Features', icon: Layers },
      { key: 'prompts', label: 'Prompts', icon: MessageSquare },
      { key: 'teams', label: 'Teams', icon: Users },
      { key: 'sessions', label: 'Sessions', icon: Activity },
    ],
  },
  {
    label: 'Plan',
    items: [
      { key: 'forecast', label: 'Forecast', icon: TrendingUp },
      { key: 'estimator', label: 'Estimator', icon: Calculator },
      { key: 'reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Manage',
    items: [
      { key: 'alerts', label: 'Alerts', icon: Bell },
      { key: 'infrastructure', label: 'Infrastructure', icon: Server },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

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

  useEffect(() => {
    document.title = `ModelTrack - ${allNavItems.find((item) => item.key === page)?.label || 'Dashboard'}`;
  }, [page]);

  return (
    <RadixTooltip.Provider delayDuration={200}>
      <div className="flex h-screen bg-gray-950 text-gray-100">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-gray-800 flex flex-col">
          <div className="px-5 py-5 border-b border-gray-800">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-emerald-400">Model</span>Track
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">AI FinOps Platform</p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'mt-6' : ''}>
                <p className="px-3 mb-2 text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = page === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setPage(item.key)}
                        className={`group w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150 flex items-center gap-2.5 ${
                          isActive
                            ? 'bg-gray-800 text-gray-100 border-l-2 border-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.06)]'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 hover:translate-x-0.5 border-l-2 border-transparent'
                        }`}
                      >
                        <Icon
                          size={16}
                          className={`shrink-0 transition-colors duration-150 ${
                            isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'
                          }`}
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
        <main className="flex-1 overflow-y-auto p-8 min-h-screen">
          <div key={page} className="animate-fade-in">
            <ErrorBoundary key={page}>
              <PageContent page={page} setPage={setPage} />
            </ErrorBoundary>
          </div>
        </main>

        <CommandPalette onNavigate={setPage} />
      </div>
    </RadixTooltip.Provider>
  );
}
