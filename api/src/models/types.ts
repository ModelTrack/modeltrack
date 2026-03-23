export interface CostEvent {
  event_id: string;
  timestamp: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status_code: number;
  is_streaming: boolean;
  app_id: string;
  team: string;
  feature: string;
  customer_tier: string;
  session_id: string;
  trace_id: string;
  prompt_hash: string;
  system_prompt_tokens: number;
  user_prompt_tokens: number;
  prompt_template_id: string;
  event_type?: string;
  service?: string;
  resource_id?: string;
  region?: string;
  instance_type?: string;
  gpu_type?: string;
  gpu_count?: number;
  gpu_utilization_pct?: number;
  namespace?: string;
  pod_name?: string;
  job_name?: string;
  cache_hit?: boolean;
  routed_from?: string;
  routed_to?: string;
  routing_rule?: string;
}

export interface SpendSummary {
  total_spend: number;
  by_team: Record<string, number>;
  by_model: Record<string, number>;
  by_app: Record<string, number>;
}

export interface ModelUsage {
  model: string;
  provider: string;
  total_spend: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  avg_cost_per_request: number;
  request_count: number;
}

export interface TeamSpend {
  team: string;
  total_spend: number;
  request_count: number;
  by_model: Record<string, number>;
  by_app: Record<string, number>;
}

export interface Alert {
  id: string;
  type: "anomaly" | "budget_exceeded";
  message: string;
  team?: string;
  app_id?: string;
  model?: string;
  hour: string;
  hourly_spend: number;
  avg_spend: number;
  created_at: string;
}

export interface Budget {
  id: string;
  team?: string;
  app_id?: string;
  daily_limit_usd: number;
  monthly_limit_usd: number;
  created_at: string;
}

export interface FeatureUsage {
  feature: string;
  total_cost: number;
  request_count: number;
  avg_cost_per_request: number;
  total_input_tokens: number;
  total_output_tokens: number;
  primary_model: string;
  primary_team: string;
}

export interface SessionCost {
  session_id: string;
  total_cost: number;
  request_count: number;
  models: string;
  duration_seconds: number;
  team: string;
  app_id: string;
  first_seen: string;
  last_seen: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ReportSummary {
  total_spend: number;
  total_requests: number;
  unique_models: number;
  unique_teams: number;
  unique_features: number;
  avg_cost_per_request: number;
  cache_hit_rate: number;
}

export interface ReportTrends {
  spend_change_pct: number;
  request_change_pct: number;
  cost_efficiency_change_pct: number;
}

export interface OptimizationAction {
  type: "routing_savings" | "cache_savings" | "budget_enforced" | "recommendation";
  description: string;
  estimated_savings: number;
}

export interface CostEstimate {
  cost_per_request: number;
  daily_cost: number;
  weekly_cost: number;
  monthly_cost: number;
  quarterly_cost: number;
  annual_cost: number;
}

export interface ModelComparison {
  model: string;
  provider: string;
  cost_per_request: number;
  monthly_cost: number;
  is_selected: boolean;
  savings_vs_selected: number;
}

export interface EstimatorResult {
  estimate: CostEstimate;
  with_caching: {
    cost_per_request: number;
    daily_cost: number;
    monthly_cost: number;
    savings_vs_no_cache: number;
    savings_pct: number;
  };
  model_comparison: ModelComparison[];
  similar_features: Array<{
    feature: string;
    avg_cost_per_request: number;
    monthly_cost: number;
    request_count: number;
  }>;
}

export interface ModelPricing {
  provider: string;
  model: string;
  input_per_mtok: number;
  output_per_mtok: number;
}

export interface ExecutiveReport {
  period: { start: string; end: string; label: string };
  summary: ReportSummary;
  trends: ReportTrends;
  spend_by_team: Array<{ team: string; spend: number; requests: number; pct_of_total: number }>;
  spend_by_model: Array<{ model: string; spend: number; requests: number; pct_of_total: number }>;
  spend_by_feature: Array<{ feature: string; spend: number; requests: number; avg_cost: number }>;
  daily_spend: Array<{ date: string; spend: number; requests: number }>;
  optimization_actions: OptimizationAction[];
  recommendations: string[];
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  low: number;
  high: number;
}

export interface ForecastSummary {
  current_monthly_run_rate: number;
  projected_next_month: number;
  projected_next_quarter: number;
  growth_rate_pct: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface ForecastScenarios {
  current_trend: { monthly: number; quarterly: number };
  if_traffic_doubles: { monthly: number; quarterly: number };
  if_switch_to_cheaper_model: {
    monthly: number;
    quarterly: number;
    savings: number;
    description: string;
  };
}

export interface ForecastData {
  historical: Array<{ date: string; spend: number }>;
  forecast: ForecastPoint[];
  summary: ForecastSummary;
  scenarios: ForecastScenarios;
}

export interface SegmentSpend {
  customer_tier: string;
  total_cost: number;
  request_count: number;
  avg_cost_per_request: number;
}
