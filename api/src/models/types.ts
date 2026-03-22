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

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
