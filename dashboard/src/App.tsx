import { useState } from 'react';
import Overview from './pages/Overview';
import Models from './pages/Models';
import Features from './pages/Features';
import Teams from './pages/Teams';
import Sessions from './pages/Sessions';
import Alerts from './pages/Alerts';

type Page = 'overview' | 'models' | 'features' | 'teams' | 'sessions' | 'alerts';

const navItems: { key: Page; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'models', label: 'Models' },
  { key: 'features', label: 'Features' },
  { key: 'teams', label: 'Teams' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'alerts', label: 'Alerts' },
];

export default function App() {
  const [page, setPage] = useState<Page>('overview');

  return (
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {page === 'overview' && <Overview />}
        {page === 'models' && <Models />}
        {page === 'features' && <Features />}
        {page === 'teams' && <Teams />}
        {page === 'sessions' && <Sessions />}
        {page === 'alerts' && <Alerts />}
      </main>
    </div>
  );
}
