import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Card from '../components/Card';
import PageWrapper from '../components/PageWrapper';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import { formatCurrency } from '../lib/format';

interface ApiAlert {
  id: string;
  type: string;
  message: string;
  team: string;
  hour: string;
  hourly_spend: number;
  avg_spend: number;
  dismissed_at: string | null;
  created_at: string;
}

interface Budget {
  id: string;
  team: string;
  app_id: string;
  monthly_limit_usd: number;
  created_at: string;
}

export default function Alerts() {
  const { data: raw, loading, error, isFirstLoad, refetch: refetchAlerts } = useApi<ApiAlert[]>('/api/alerts');
  const { data: budgets, refetch: refetchBudgets } = useApi<Budget[]>('/api/alerts/budgets');

  const [team, setTeam] = useState('');
  const [app, setApp] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      setSubmitMsg('Budget saved.');
      setTeam('');
      setApp('');
      setBudget('');
      refetchBudgets();
    } catch (err) {
      setSubmitMsg(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBudget(id: string) {
    try {
      await fetch(`/api/alerts/budgets/${id}`, { method: 'DELETE' });
      refetchBudgets();
    } catch { /* */ }
  }

  async function dismissAlert(id: string) {
    try {
      await fetch(`/api/alerts/${id}/dismiss`, { method: 'PATCH' });
      refetchAlerts();
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch { /* */ }
  }

  async function dismissSelected() {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/alerts/dismiss-bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      refetchAlerts();
    } catch { /* */ }
  }

  async function restoreAll() {
    try {
      await fetch('/api/alerts/restore-all', { method: 'PATCH' });
      refetchAlerts();
    } catch { /* */ }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(alertIds: string[]) {
    const allSelected = alertIds.length > 0 && alertIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(alertIds));
  }

  return (
    <PageWrapper
      data={raw}
      loading={loading}
      error={error}
      isFirstLoad={isFirstLoad}
      skeleton={
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-100">Alerts & Budgets</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><SkeletonCard /><div className="mt-4"><SkeletonCard /></div></div>
            <div className="lg:col-span-2"><SkeletonTable rows={5} columns={3} /></div>
          </div>
        </div>
      }
    >
      {(data) => {
        const alerts = data.map((a) => ({
          ...a,
          severity: a.hourly_spend > 3 * a.avg_spend ? 'critical' as const : 'warning' as const,
        }));

        const filtered = alerts.filter(
          (a) => severityFilter === 'all' || a.severity === severityFilter
        );

        const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
        const warningCount = alerts.filter((a) => a.severity === 'warning').length;

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-100">Alerts & Budgets</h2>
              <button
                onClick={restoreAll}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Restore dismissed
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: Budgets + form */}
              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Active Budgets</h3>
                  {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-gray-500">No budgets set</p>
                  ) : (
                    <div className="space-y-2">
                      {budgets.map((b) => (
                        <div key={b.id} className="flex items-center justify-between bg-gray-800/50 rounded-md px-3 py-2">
                          <div>
                            <p className="text-sm text-gray-200">{b.team}{b.app_id ? ` / ${b.app_id}` : ''}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(b.monthly_limit_usd)}/mo</p>
                          </div>
                          <button onClick={() => deleteBudget(b.id)} className="text-gray-500 hover:text-red-400 text-xs transition-colors">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Set Budget</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} required
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Team" />
                    <input type="text" value={app} onChange={(e) => setApp(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="App (optional)" />
                    <input type="number" step="0.01" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} required
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Monthly budget ($)" />
                    <button type="submit" disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors">
                      {submitting ? 'Saving...' : 'Add Budget'}
                    </button>
                    {submitMsg && (
                      <p className={`text-xs ${submitMsg.startsWith('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{submitMsg}</p>
                    )}
                  </form>
                </Card>
              </div>

              {/* Right column: Alerts */}
              <div className="lg:col-span-2 space-y-4">
                {/* Severity filter tabs */}
                <div className="flex items-center gap-2">
                  {(['all', 'critical', 'warning'] as const).map((s) => (
                    <button key={s} onClick={() => setSeverityFilter(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        severityFilter === s ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}>
                      {s === 'critical' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      {s === 'warning' && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                      {s === 'all' ? `All (${alerts.length})` :
                       s === 'critical' ? `Critical (${criticalCount})` :
                       `Warning (${warningCount})`}
                    </button>
                  ))}
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-gray-300">{selectedIds.size} selected</span>
                    <button onClick={dismissSelected} className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors">
                      Dismiss selected
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-300 transition-colors ml-auto">
                      Clear selection
                    </button>
                  </div>
                )}

                {/* Alert list */}
                <Card padding="sm" className="overflow-hidden">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-8 text-center text-gray-500">No alerts</p>
                  ) : (
                    <>
                      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-3">
                        <input type="checkbox"
                          checked={filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))}
                          onChange={() => toggleSelectAll(filtered.map((a) => a.id))}
                          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
                        <span className="text-xs text-gray-500">Select all</span>
                      </div>
                      <ul className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
                        {filtered.map((alert) => (
                          <li key={alert.id} className="px-4 py-3 flex items-start gap-3 group hover:bg-gray-800/30">
                            <input type="checkbox"
                              checked={selectedIds.has(alert.id)}
                              onChange={() => toggleSelect(alert.id)}
                              className="mt-0.5 w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer shrink-0" />
                            <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                              alert.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{alert.hour}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-medium text-gray-300 tabular-nums">
                                {formatCurrency(alert.hourly_spend)}
                              </span>
                              <button onClick={() => dismissAlert(alert.id)}
                                className="text-gray-600 hover:text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                Dismiss
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </PageWrapper>
  );
}
