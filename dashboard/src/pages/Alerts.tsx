import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import AlertsList from '../components/AlertsList';
import type { Alert } from '../types';

interface ApiAlert {
  id: string;
  type: string;
  message: string;
  team: string;
  hour: string;
  hourly_spend: number;
  avg_spend: number;
  created_at: string;
}

export default function Alerts() {
  const { data: raw, loading, error } = useApi<ApiAlert[]>('/api/alerts');

  const [team, setTeam] = useState('');
  const [app, setApp] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !budget) return;

    setSubmitting(true);
    setSubmitMsg('');

    try {
      const res = await fetch('/api/alerts/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team,
          app_id: app || undefined,
          monthly_limit_usd: parseFloat(budget),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSubmitMsg('Budget threshold saved.');
      setTeam('');
      setApp('');
      setBudget('');
    } catch (err) {
      setSubmitMsg(
        `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !raw) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Error: {error}
      </div>
    );
  }

  // Map API alerts to the Alert interface expected by AlertsList
  const alerts: Alert[] = (raw ?? []).map((a) => ({
    id: a.id,
    severity: a.hourly_spend > 3 * a.avg_spend ? 'critical' as const : 'warning' as const,
    description: a.message,
    timestamp: a.created_at,
    amount: a.hourly_spend,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Alerts</h2>

      <AlertsList alerts={alerts} />

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-lg font-medium text-gray-100 mb-4">
          Set Budget Threshold
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Team</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g. ml-platform"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              App (optional)
            </label>
            <input
              type="text"
              value={app}
              onChange={(e) => setApp(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g. chatbot-v2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Monthly Budget ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="5000.00"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
          >
            {submitting ? 'Saving...' : 'Set Budget'}
          </button>
          {submitMsg && (
            <p
              className={`text-sm ${
                submitMsg.startsWith('Failed') ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {submitMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
