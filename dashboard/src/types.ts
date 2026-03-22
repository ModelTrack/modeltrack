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

export interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
  amount: number;
}
