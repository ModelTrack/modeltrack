import { useApi } from '../hooks/useApi';
import { useSort } from '../hooks/useSort';
import Card from '../components/Card';
import PageWrapper from '../components/PageWrapper';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import type { PromptAnalysis, PromptSummary } from '../types';
import { formatCurrency, formatNumber, formatTokens } from '../lib/format';

type SortKey = 'prompt_id' | 'request_count' | 'avg_system_tokens' | 'avg_user_tokens' | 'avg_output_tokens' | 'avg_cost_per_request' | 'total_cost';

export default function Prompts() {
  const { data: prompts, loading, error, isFirstLoad } = useApi<PromptAnalysis[]>('/api/prompts');
  const { data: summary } = useApi<PromptSummary>('/api/prompts/summary');

  return (
    <PageWrapper
      data={prompts}
      loading={loading}
      error={error}
      isFirstLoad={isFirstLoad}
      skeleton={
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-100">Prompt Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">
              Identify expensive prompt patterns and optimization opportunities
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={5} columns={7} />
        </div>
      }
    >
      {(data) => <PromptsContent prompts={data} summary={summary} />}
    </PageWrapper>
  );
}

function PromptsContent({ prompts, summary }: { prompts: PromptAnalysis[]; summary: PromptSummary | null }) {
  const { sorted, handleSort, indicator } = useSort(prompts, 'total_cost' as keyof PromptAnalysis);

  const columns: { key: SortKey; label: string }[] = [
    { key: 'prompt_id', label: 'Prompt ID' },
    { key: 'request_count', label: 'Requests' },
    { key: 'avg_system_tokens', label: 'Avg System Tokens' },
    { key: 'avg_user_tokens', label: 'Avg User Tokens' },
    { key: 'avg_output_tokens', label: 'Avg Output Tokens' },
    { key: 'avg_cost_per_request', label: 'Avg Cost/Req' },
    { key: 'total_cost', label: 'Total Cost' },
  ];

  const promptsWithSuggestions = prompts.filter(
    (p) => p.optimization_suggestions.length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100">Prompt Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          Identify expensive prompt patterns and optimization opportunities
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Unique Prompts</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {summary ? formatNumber(summary.total_unique_prompts) : '--'}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Most Expensive</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">
            {summary?.most_expensive_prompt
              ? formatCurrency(summary.most_expensive_prompt.total_cost)
              : '--'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {summary?.most_expensive_prompt?.id || ''}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Longest System Prompt</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {summary?.longest_system_prompt
              ? formatTokens(Math.round(summary.longest_system_prompt.avg_system_tokens)) + ' tokens'
              : '--'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {summary?.longest_system_prompt?.id || ''}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Most Cacheable</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {summary?.most_cacheable
              ? formatNumber(summary.most_cacheable.request_count) + ' calls'
              : '--'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {summary?.most_cacheable?.id || ''}
          </p>
        </Card>
      </div>

      {/* Potential Savings */}
      {summary && summary.potential_savings > 0 && (
        <div className="bg-gray-900 border border-emerald-800/50 rounded-lg p-4">
          <p className="text-sm text-emerald-400 font-medium">
            Estimated potential savings: {formatCurrency(summary.potential_savings)} if top recommendations are followed
          </p>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden" padding="sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 font-medium cursor-pointer hover:text-gray-200 select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {indicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.prompt_id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium text-gray-100 max-w-[180px] truncate" title={row.prompt_id}>
                    {row.prompt_id}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatNumber(row.request_count)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatTokens(Math.round(row.avg_system_tokens))}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatTokens(Math.round(row.avg_user_tokens))}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatTokens(Math.round(row.avg_output_tokens))}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatCurrency(row.avg_cost_per_request)}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {formatCurrency(row.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Optimization Suggestions */}
      {promptsWithSuggestions.length > 0 && (
        <Card>
          <h3 className="text-lg font-medium text-gray-100 mb-4">
            Optimization Suggestions
          </h3>
          <div className="space-y-4">
            {promptsWithSuggestions.map((p) => (
              <div key={p.prompt_id} className="border-b border-gray-800/50 pb-3 last:border-0">
                <p className="text-sm font-medium text-gray-200 mb-1 truncate" title={p.prompt_id}>
                  {p.prompt_id}
                </p>
                <ul className="space-y-1">
                  {p.optimization_suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-yellow-400 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">*</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
