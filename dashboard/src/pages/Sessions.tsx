import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import type { SessionCost } from '../types';
import { formatCurrency, formatNumber, formatRelativeTime } from '../lib/format';

interface SessionEvent {
  event_id: string;
  timestamp: string;
  model: string;
  provider: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  feature: string;
  trace_id: string;
}

interface SessionDetail {
  summary: SessionCost & { trace_ids: string[] };
  events: SessionEvent[];
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function SessionDetailView({ sessionId }: { sessionId: string }) {
  const { data, loading, error } = useApi<SessionDetail>(`/api/sessions/${sessionId}`);

  if (loading && !data) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-3 text-gray-500 text-center">
          Loading session events...
        </td>
      </tr>
    );
  }

  if (error || !data) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-3 text-red-400 text-center">
          Failed to load session detail
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-700">
          {data.summary.trace_ids && data.summary.trace_ids.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Trace IDs: </span>
              <span className="text-xs text-gray-300 font-mono">
                {data.summary.trace_ids.join(', ')}
              </span>
            </div>
          )}
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            Events in Session
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="pb-2 font-medium">Timestamp</th>
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 font-medium">Trace ID</th>
                <th className="pb-2 font-medium">Tokens (in/out)</th>
                <th className="pb-2 font-medium">Latency</th>
                <th className="pb-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.event_id} className="border-t border-gray-700/50">
                  <td className="py-2 text-gray-400 font-mono text-xs">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 text-gray-300">{event.model}</td>
                  <td className="py-2 text-gray-400">{event.feature || '-'}</td>
                  <td className="py-2 text-gray-400 font-mono text-xs" title={event.trace_id}>
                    {event.trace_id ? truncateId(event.trace_id) : '-'}
                  </td>
                  <td className="py-2 text-gray-300">
                    {formatNumber(event.input_tokens)} / {formatNumber(event.output_tokens)}
                  </td>
                  <td className="py-2 text-gray-300">{event.latency_ms}ms</td>
                  <td className="py-2 text-emerald-400">{formatCurrency(event.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default function Sessions() {
  const { data: sessions, loading, error } = useApi<SessionCost[]>('/api/sessions');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  if (loading && !sessions) {
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

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Sessions</h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No sessions recorded yet. Send requests with the X-CostTrack-Session-ID header to start tracking sessions.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-100">Sessions</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Session ID</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Models Used</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <>
                  <tr
                    key={session.session_id}
                    onClick={() =>
                      setExpandedSession(
                        expandedSession === session.session_id ? null : session.session_id
                      )
                    }
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-gray-300" title={session.session_id}>
                      {truncateId(session.session_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{session.team || '-'}</td>
                    <td className="px-4 py-3 text-gray-300">{session.app_id || '-'}</td>
                    <td className="px-4 py-3 text-gray-300">{formatNumber(session.request_count)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {session.models.split(',').join(', ')}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-emerald-400">
                      {formatCurrency(session.total_cost)}
                    </td>
                  </tr>
                  {expandedSession === session.session_id && (
                    <SessionDetailView
                      key={`detail-${session.session_id}`}
                      sessionId={session.session_id}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
