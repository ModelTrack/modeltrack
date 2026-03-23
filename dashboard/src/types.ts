export interface ModelRow {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  avg_cost_per_request: number;
}

export interface TeamRow {
  team: string;
  total_cost: number;
  requests: number;
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

export interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
  amount: number;
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

export interface PromptAnalysis {
  prompt_id: string;
  request_count: number;
  total_cost: number;
  avg_cost_per_request: number;
  avg_system_tokens: number;
  avg_user_tokens: number;
  avg_output_tokens: number;
  models_used: string;
  features: string;
  teams: string;
  optimization_suggestions: string[];
}

export interface PromptSummary {
  total_unique_prompts: number;
  most_expensive_prompt: { id: string; total_cost: number } | null;
  longest_system_prompt: { id: string; avg_system_tokens: number } | null;
  most_cacheable: { id: string; request_count: number } | null;
  potential_savings: number;
}

export interface ExecutiveReport {
  period: { start: string; end: string; label: string };
  summary: {
    total_spend: number;
    total_requests: number;
    unique_models: number;
    unique_teams: number;
    unique_features: number;
    avg_cost_per_request: number;
    cache_hit_rate: number;
  };
  trends: {
    spend_change_pct: number;
    request_change_pct: number;
    cost_efficiency_change_pct: number;
  };
  spend_by_team: Array<{ team: string; spend: number; requests: number; pct_of_total: number }>;
  spend_by_model: Array<{ model: string; spend: number; requests: number; pct_of_total: number }>;
  spend_by_feature: Array<{ feature: string; spend: number; requests: number; avg_cost: number }>;
  daily_spend: Array<{ date: string; spend: number; requests: number }>;
  optimization_actions: Array<{
    type: string;
    description: string;
    estimated_savings: number;
  }>;
  recommendations: string[];
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
