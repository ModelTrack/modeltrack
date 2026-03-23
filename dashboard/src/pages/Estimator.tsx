import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import Card from '../components/Card';
import { formatCurrency } from '../lib/format';
import type { ModelPricing, EstimatorResult } from '../types';

const API_BASE = '';

export default function Estimator() {
  const { data: models } = useApi<ModelPricing[]>('/api/estimator/models');

  const [selectedModel, setSelectedModel] = useState('claude-haiku-4-5');
  const [avgInputTokens, setAvgInputTokens] = useState(500);
  const [avgOutputTokens, setAvgOutputTokens] = useState(200);
  const [requestsPerDay, setRequestsPerDay] = useState(1000);
  const [cacheHitRate, setCacheHitRate] = useState(20);
  const [description, setDescription] = useState('');

  const [result, setResult] = useState<EstimatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/estimator/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          avg_input_tokens: avgInputTokens,
          avg_output_tokens: avgOutputTokens,
          requests_per_day: requestsPerDay,
          cache_hit_rate: cacheHitRate / 100,
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [selectedModel, avgInputTokens, avgOutputTokens, requestsPerDay, cacheHitRate, description]);

  // Auto-calculate with debounce
  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      calculate();
    }, 300);
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [calculate]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">Cost Estimator</h2>
        <p className="text-sm text-gray-400 mt-1">Estimate costs before you ship</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <Card className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-medium text-gray-100">Configuration</h3>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {(models || []).map((m) => (
                <option key={m.model} value={m.model}>
                  {m.model} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Avg Input Tokens</label>
            <input
              type="number"
              min={0}
              value={avgInputTokens}
              onChange={(e) => setAvgInputTokens(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Avg Output Tokens</label>
            <input
              type="number"
              min={0}
              value={avgOutputTokens}
              onChange={(e) => setAvgOutputTokens(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Requests per Day</label>
            <input
              type="number"
              min={0}
              value={requestsPerDay}
              onChange={(e) => setRequestsPerDay(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Expected Cache Hit Rate: {cacheHitRate}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={cacheHitRate}
              onChange={(e) => setCacheHitRate(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. FAQ chatbot"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Primary Estimate */}
              <Card>
                <h3 className="text-lg font-medium text-gray-100 mb-4">Estimated Cost</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Per Request" value={formatCurrency(result.estimate.cost_per_request)} />
                  <StatCard label="Daily" value={formatCurrency(result.estimate.daily_cost)} />
                  <StatCard label="Monthly" value={formatCurrency(result.estimate.monthly_cost)} large />
                  <StatCard label="Annual" value={formatCurrency(result.estimate.annual_cost)} large />
                </div>
              </Card>

              {/* With Caching */}
              <Card>
                <h3 className="text-lg font-medium text-gray-100 mb-4">With Caching</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Per Request" value={formatCurrency(result.with_caching.cost_per_request)} />
                  <StatCard label="Daily" value={formatCurrency(result.with_caching.daily_cost)} />
                  <StatCard label="Monthly" value={formatCurrency(result.with_caching.monthly_cost)} />
                  <StatCard
                    label="Monthly Savings"
                    value={formatCurrency(result.with_caching.savings_vs_no_cache)}
                    sub={`${result.with_caching.savings_pct.toFixed(1)}% saved`}
                    positive
                  />
                </div>
              </Card>

              {/* Model Comparison */}
              <Card>
                <h3 className="text-lg font-medium text-gray-100 mb-4">Model Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left py-2 px-3 font-medium">Model</th>
                        <th className="text-right py-2 px-3 font-medium">Cost/Request</th>
                        <th className="text-right py-2 px-3 font-medium">Monthly Cost</th>
                        <th className="text-right py-2 px-3 font-medium">vs Selected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.model_comparison.map((m) => {
                        const isSelected = m.is_selected;
                        const savings = m.savings_vs_selected;
                        return (
                          <tr
                            key={m.model}
                            className={`border-b border-gray-800/50 ${
                              isSelected ? 'bg-emerald-900/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3">
                              <span className={isSelected ? 'text-emerald-400 font-medium' : 'text-gray-100'}>
                                {m.model}
                              </span>
                              {isSelected && (
                                <span className="ml-2 text-xs bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded">
                                  selected
                                </span>
                              )}
                            </td>
                            <td className="text-right py-2 px-3 text-gray-300">
                              {formatCurrency(m.cost_per_request)}
                            </td>
                            <td className="text-right py-2 px-3 text-gray-300">
                              {formatCurrency(m.monthly_cost)}
                            </td>
                            <td className="text-right py-2 px-3">
                              {isSelected ? (
                                <span className="text-gray-500">--</span>
                              ) : savings > 0 ? (
                                <span className="text-emerald-400">
                                  +{formatCurrency(savings)} cheaper
                                </span>
                              ) : (
                                <span className="text-red-400">
                                  {formatCurrency(Math.abs(savings))} more
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Similar Features */}
              {result.similar_features.length > 0 && (
                <Card>
                  <h3 className="text-lg font-medium text-gray-100 mb-4">
                    Similar Existing Features
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-800">
                          <th className="text-left py-2 px-3 font-medium">Feature</th>
                          <th className="text-right py-2 px-3 font-medium">Avg Cost/Request</th>
                          <th className="text-right py-2 px-3 font-medium">Monthly Cost</th>
                          <th className="text-right py-2 px-3 font-medium">Requests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.similar_features.map((f) => (
                          <tr key={f.feature} className="border-b border-gray-800/50">
                            <td className="py-2 px-3 text-gray-100">{f.feature}</td>
                            <td className="text-right py-2 px-3 text-gray-300">
                              {formatCurrency(f.avg_cost_per_request)}
                            </td>
                            <td className="text-right py-2 px-3 text-gray-300">
                              {formatCurrency(f.monthly_cost)}
                            </td>
                            <td className="text-right py-2 px-3 text-gray-300">
                              {f.request_count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {!result && !error && !loading && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Configure your feature parameters to see cost estimates
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  large,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`font-semibold ${large ? 'text-xl' : 'text-lg'} text-gray-100`}>{value}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${positive ? 'text-emerald-400' : 'text-gray-500'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
