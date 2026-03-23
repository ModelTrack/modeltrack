package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"syscall"
)

// CostEvent represents a single cost event, matching the proxy's format exactly.
// Infrastructure events reuse the same struct with event_type-specific semantics.
type CostEvent struct {
	EventID          string  `json:"event_id"`
	Timestamp        string  `json:"timestamp"`
	EventType        string  `json:"event_type,omitempty"`
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	Service          string  `json:"service,omitempty"`
	InputTokens      int     `json:"input_tokens"`
	OutputTokens     int     `json:"output_tokens"`
	CacheReadTokens  int     `json:"cache_read_tokens"`
	CacheWriteTokens int     `json:"cache_write_tokens"`
	CostUSD          float64 `json:"cost_usd"`
	LatencyMs        int64   `json:"latency_ms"`
	StatusCode       int     `json:"status_code"`
	IsStreaming      bool    `json:"is_streaming"`
	AppID            string  `json:"app_id,omitempty"`
	Team             string  `json:"team,omitempty"`
	Feature          string  `json:"feature,omitempty"`
	CustomerTier     string  `json:"customer_tier,omitempty"`
	SessionID        string  `json:"session_id,omitempty"`
	TraceID          string  `json:"trace_id,omitempty"`
	CacheHit         bool    `json:"cache_hit,omitempty"`
	RoutedFrom       string  `json:"routed_from,omitempty"`
	RoutedTo         string  `json:"routed_to,omitempty"`
	RoutingRule      string  `json:"routing_rule,omitempty"`
	TokenSummary     string  `json:"token_summary"`
	PromptHash       string  `json:"prompt_hash,omitempty"`

	// Infrastructure-specific fields
	ResourceID        string  `json:"resource_id,omitempty"`
	Region            string  `json:"region,omitempty"`
	InstanceType      string  `json:"instance_type,omitempty"`
	GPUType           string  `json:"gpu_type,omitempty"`
	GPUUtilizationPct float64 `json:"gpu_utilization_pct,omitempty"`
	Namespace         string  `json:"namespace,omitempty"`
	PodName           string  `json:"pod_name,omitempty"`
	JobName           string  `json:"job_name,omitempty"`

	SystemPromptTokens int    `json:"system_prompt_tokens,omitempty"`
	UserPromptTokens   int    `json:"user_prompt_tokens,omitempty"`
	PromptTemplateID   string `json:"prompt_template_id,omitempty"`
}

// EventWriter appends CostEvents as JSONL to a shared file with file locking.
type EventWriter struct {
	filePath string
	mu       sync.Mutex
}

// NewEventWriter creates an EventWriter for the given file path.
func NewEventWriter(filePath string) *EventWriter {
	return &EventWriter{filePath: filePath}
}

// WriteEvents appends a batch of cost events to the JSONL file.
// Uses both an in-process mutex and OS-level file locking (flock) to
// coordinate with the proxy process writing to the same file.
func (w *EventWriter) WriteEvents(events []CostEvent) error {
	if len(events) == 0 {
		return nil
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	f, err := os.OpenFile(w.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("opening cost events file: %w", err)
	}
	defer f.Close()

	// Acquire an exclusive file lock to coordinate with the proxy process.
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX); err != nil {
		return fmt.Errorf("acquiring file lock: %w", err)
	}
	defer syscall.Flock(int(f.Fd()), syscall.LOCK_UN)

	enc := json.NewEncoder(f)
	for i := range events {
		if err := enc.Encode(&events[i]); err != nil {
			return fmt.Errorf("encoding event: %w", err)
		}
	}

	return nil
}
