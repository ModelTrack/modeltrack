package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/costtrack/proxy/adapters"
	"github.com/google/uuid"
)

// ProxyHandler is the main HTTP handler that routes requests to provider adapters.
type ProxyHandler struct {
	anthropic *adapters.AnthropicAdapter
	openai    *adapters.OpenAIAdapter
	logger    *EventLogger
	budget    *BudgetTracker
}

// NewProxyHandler creates a new handler with the given adapters, logger, and budget tracker.
func NewProxyHandler(anthropic *adapters.AnthropicAdapter, openai *adapters.OpenAIAdapter, logger *EventLogger, budget *BudgetTracker) *ProxyHandler {
	return &ProxyHandler{
		anthropic: anthropic,
		openai:    openai,
		logger:    logger,
		budget:    budget,
	}
}

// ServeHTTP routes requests to the appropriate provider adapter.
func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/v1/messages":
		h.handleAnthropicMessages(w, r)
	case "/v1/chat/completions":
		h.handleOpenAIChatCompletions(w, r)
	default:
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	}
}

// handleAnthropicMessages proxies requests to the Anthropic Messages API.
func (h *ProxyHandler) handleAnthropicMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract CostTrack attribution headers.
	appID := r.Header.Get("X-CostTrack-App")
	team := r.Header.Get("X-CostTrack-Team")
	feature := r.Header.Get("X-CostTrack-Feature")
	customerTier := r.Header.Get("X-CostTrack-Customer-Tier")

	// Check budget before forwarding the request.
	if h.budget != nil && team != "" {
		budgetResult := h.budget.CheckBudget(team, appID)
		if budgetResult.Status == BudgetExceeded && budgetResult.Action == "block" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(budgetResult.FormatExceededMessage()))
			return
		}
		if budgetResult.Status == BudgetWarning || (budgetResult.Status == BudgetExceeded && budgetResult.Action == "warn") {
			w.Header().Set("X-CostTrack-Budget-Warning", budgetResult.FormatWarningHeader())
		}
	}

	// Proxy the request to Anthropic.
	result, err := h.anthropic.Proxy(w, r)
	if err != nil {
		log.Printf("ERROR: proxy failed: %v", err)
		// Only write error if headers haven't been sent yet.
		// If streaming already started, we can't change the status code.
		return
	}

	// Calculate cost.
	cost := CalculateCost(
		"anthropic",
		result.Usage.Model,
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
		result.Usage.CacheReadTokens,
		result.Usage.CacheWriteTokens,
	)

	// Build token summary.
	summary := fmt.Sprintf("in=%d out=%d cache_read=%d cache_write=%d",
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
		result.Usage.CacheReadTokens,
		result.Usage.CacheWriteTokens,
	)

	// Log the cost event asynchronously.
	event := CostEvent{
		EventID:          uuid.New().String(),
		Timestamp:        time.Now().UTC().Format(time.RFC3339Nano),
		Provider:         "anthropic",
		Model:            result.Usage.Model,
		InputTokens:      result.Usage.InputTokens,
		OutputTokens:     result.Usage.OutputTokens,
		CacheReadTokens:  result.Usage.CacheReadTokens,
		CacheWriteTokens: result.Usage.CacheWriteTokens,
		CostUSD:          cost,
		LatencyMs:        result.LatencyMs,
		StatusCode:       result.StatusCode,
		IsStreaming:      result.IsStream,
		AppID:            appID,
		Team:             team,
		Feature:          feature,
		CustomerTier:     customerTier,
		TokenSummary:     summary,
	}

	h.logger.Log(event)

	// Update budget tracker and add warning headers if needed.
	if h.budget != nil && team != "" {
		h.budget.RecordSpend(team, appID, cost)
		budgetResult := h.budget.CheckBudget(team, appID)
		if budgetResult.Status == BudgetWarning {
			w.Header().Set("X-CostTrack-Budget-Warning", budgetResult.FormatWarningHeader())
		}
	}
}

// handleOpenAIChatCompletions proxies requests to the OpenAI Chat Completions API.
func (h *ProxyHandler) handleOpenAIChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract CostTrack attribution headers.
	appID := r.Header.Get("X-CostTrack-App")
	team := r.Header.Get("X-CostTrack-Team")
	feature := r.Header.Get("X-CostTrack-Feature")
	customerTier := r.Header.Get("X-CostTrack-Customer-Tier")

	// Check budget before forwarding the request.
	if h.budget != nil && team != "" {
		budgetResult := h.budget.CheckBudget(team, appID)
		if budgetResult.Status == BudgetExceeded && budgetResult.Action == "block" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(budgetResult.FormatExceededMessage()))
			return
		}
		if budgetResult.Status == BudgetWarning || (budgetResult.Status == BudgetExceeded && budgetResult.Action == "warn") {
			w.Header().Set("X-CostTrack-Budget-Warning", budgetResult.FormatWarningHeader())
		}
	}

	// Proxy the request to OpenAI.
	result, err := h.openai.Proxy(w, r)
	if err != nil {
		log.Printf("ERROR: proxy failed: %v", err)
		// Only write error if headers haven't been sent yet.
		// If streaming already started, we can't change the status code.
		return
	}

	// Calculate cost.
	cost := CalculateCost(
		"openai",
		result.Usage.Model,
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
		result.Usage.CacheReadTokens,
		result.Usage.CacheWriteTokens,
	)

	// Build token summary.
	summary := fmt.Sprintf("in=%d out=%d",
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
	)

	// Log the cost event asynchronously.
	event := CostEvent{
		EventID:      uuid.New().String(),
		Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
		Provider:     "openai",
		Model:        result.Usage.Model,
		InputTokens:  result.Usage.InputTokens,
		OutputTokens: result.Usage.OutputTokens,
		CostUSD:      cost,
		LatencyMs:    result.LatencyMs,
		StatusCode:   result.StatusCode,
		IsStreaming:   result.IsStream,
		AppID:        appID,
		Team:         team,
		Feature:      feature,
		CustomerTier: customerTier,
		TokenSummary: summary,
	}

	h.logger.Log(event)

	// Update budget tracker and add warning headers if needed.
	if h.budget != nil && team != "" {
		h.budget.RecordSpend(team, appID, cost)
		budgetResult := h.budget.CheckBudget(team, appID)
		if budgetResult.Status == BudgetWarning {
			w.Header().Set("X-CostTrack-Budget-Warning", budgetResult.FormatWarningHeader())
		}
	}
}

// HealthHandler returns 200 OK for liveness checks.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

// ReadyHandler returns 200 OK for readiness checks.
func ReadyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ready"}`))
}

// StatsHandler returns aggregate proxy statistics.
func StatsHandler(logger *EventLogger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		totalRequests, totalTokens, totalCostUSD := logger.GetStats()

		resp := map[string]interface{}{
			"total_requests": totalRequests,
			"total_tokens":   totalTokens,
			"total_cost_usd": totalCostUSD,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
