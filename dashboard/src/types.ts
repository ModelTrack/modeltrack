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
