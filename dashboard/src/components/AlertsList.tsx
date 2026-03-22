import { formatCurrency, formatRelativeTime } from '../lib/format';

export interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
  amount: number;
}

interface AlertsListProps {
  alerts: Alert[];
}

export default function AlertsList({ alerts }: AlertsListProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-lg font-medium text-gray-100">Recent Alerts</h3>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-gray-500">No alerts</p>
      ) : (
        <ul className="divide-y divide-gray-800/50">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-5 py-4 flex items-start gap-3">
              <span
                className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200">{alert.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatRelativeTime(alert.timestamp)}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-300 shrink-0">
                {formatCurrency(alert.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
