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
