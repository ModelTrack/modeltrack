package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
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
	cache     *ResponseCache
}

// NewProxyHandler creates a new handler with the given adapters, logger, budget tracker, and cache.
func NewProxyHandler(anthropic *adapters.AnthropicAdapter, openai *adapters.OpenAIAdapter, logger *EventLogger, budget *BudgetTracker, cache *ResponseCache) *ProxyHandler {
	return &ProxyHandler{
		anthropic: anthropic,
		openai:    openai,
		logger:    logger,
		budget:    budget,
		cache:     cache,
	}
}

// llmRequestFields holds the fields parsed from the request body needed for caching.
type llmRequestFields struct {
	Model       string          `json:"model"`
	Messages    json.RawMessage `json:"messages"`
	Stream      bool            `json:"stream"`
	Temperature *float64        `json:"temperature,omitempty"`
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

// isCacheable checks whether a request should be cached based on its fields and headers.
func (h *ProxyHandler) isCacheable(r *http.Request, fields *llmRequestFields) bool {
	if h.cache == nil || !h.cache.enabled {
		return false
	}
	// Don't cache streaming requests.
	if fields.Stream {
		return false
	}
	// Don't cache if X-CostTrack-No-Cache header is set.
	if r.Header.Get("X-CostTrack-No-Cache") == "true" {
		return false
	}
	// Don't cache if temperature > 0 (non-deterministic).
	if fields.Temperature != nil && *fields.Temperature > 0 {
		return false
	}
	return true
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
	sessionID := r.Header.Get("X-CostTrack-Session-ID")
	traceID := r.Header.Get("X-CostTrack-Trace-ID")

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

	// Read the request body for cache key generation.
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("ERROR: reading request body: %v", err)
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	r.Body.Close()

	// Parse fields needed for caching.
	var fields llmRequestFields
	if err := json.Unmarshal(bodyBytes, &fields); err != nil {
		log.Printf("ERROR: parsing request body: %v", err)
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	cacheable := h.isCacheable(r, &fields)
	var cacheKey string

	// Check cache for a hit.
	if cacheable {
		cacheKey = GenerateKey("anthropic", fields.Model, fields.Messages)

		if entry, ok := h.cache.Get(cacheKey); ok {
			// Cache HIT — return cached response directly.
			w.Header().Set("Content-Type", entry.ContentType)
			w.Header().Set("X-CostTrack-Cache", "HIT")
			w.Header().Set("X-CostTrack-Cache-Savings", fmt.Sprintf("$%.4f", entry.CostUSD))
			w.WriteHeader(http.StatusOK)
			w.Write(entry.ResponseBody)

			// Log cache hit event.
			event := CostEvent{
				EventID:      uuid.New().String(),
				Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
				Provider:     "anthropic",
				Model:        fields.Model,
				CostUSD:      0,
				StatusCode:   http.StatusOK,
				IsStreaming:  false,
				AppID:        appID,
				Team:         team,
				Feature:      feature,
				CustomerTier: customerTier,
				SessionID:    sessionID,
				TraceID:      traceID,
				CacheHit:     true,
				TokenSummary: "cache_hit=true",
			}
			h.logger.Log(event)
			return
		}
	}

	// Restore the request body for the adapter.
	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	// For cacheable non-streaming requests, use a recorder to capture the response.
	var recorder *httptest.ResponseRecorder
	var targetWriter http.ResponseWriter
	if cacheable {
		recorder = httptest.NewRecorder()
		targetWriter = recorder
	} else {
		targetWriter = w
	}

	// Proxy the request to Anthropic.
	result, err := h.anthropic.Proxy(targetWriter, r)
	if err != nil {
		log.Printf("ERROR: proxy failed: %v", err)
		return
	}

	// If we used a recorder, copy the response to the real writer and cache it.
	if recorder != nil {
		recResult := recorder.Result()
		contentType := recResult.Header.Get("Content-Type")

		// Copy headers from recorder to real writer.
		for k, vv := range recResult.Header {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}

		// Add cache MISS header.
		w.Header().Set("X-CostTrack-Cache", "MISS")

		w.WriteHeader(recResult.StatusCode)
		respBody := recorder.Body.Bytes()
		w.Write(respBody)

		// Cache the response if the upstream returned 200.
		if recResult.StatusCode == http.StatusOK {
			cost := CalculateCost(
				"anthropic",
				result.Usage.Model,
				result.Usage.InputTokens,
				result.Usage.OutputTokens,
				result.Usage.CacheReadTokens,
				result.Usage.CacheWriteTokens,
			)
			h.cache.Set(cacheKey, CacheEntry{
				ResponseBody: respBody,
				ContentType:  contentType,
				Timestamp:    time.Now(),
				CostUSD:      cost,
			})
		}
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
		SessionID:        sessionID,
		TraceID:          traceID,
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
	sessionID := r.Header.Get("X-CostTrack-Session-ID")
	traceID := r.Header.Get("X-CostTrack-Trace-ID")

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

	// Read the request body for cache key generation.
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("ERROR: reading request body: %v", err)
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	r.Body.Close()

	// Parse fields needed for caching.
	var fields llmRequestFields
	if err := json.Unmarshal(bodyBytes, &fields); err != nil {
		log.Printf("ERROR: parsing request body: %v", err)
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	cacheable := h.isCacheable(r, &fields)
	var cacheKey string

	// Check cache for a hit.
	if cacheable {
		cacheKey = GenerateKey("openai", fields.Model, fields.Messages)

		if entry, ok := h.cache.Get(cacheKey); ok {
			// Cache HIT — return cached response directly.
			w.Header().Set("Content-Type", entry.ContentType)
			w.Header().Set("X-CostTrack-Cache", "HIT")
			w.Header().Set("X-CostTrack-Cache-Savings", fmt.Sprintf("$%.4f", entry.CostUSD))
			w.WriteHeader(http.StatusOK)
			w.Write(entry.ResponseBody)

			// Log cache hit event.
			event := CostEvent{
				EventID:      uuid.New().String(),
				Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
				Provider:     "openai",
				Model:        fields.Model,
				CostUSD:      0,
				StatusCode:   http.StatusOK,
				IsStreaming:  false,
				AppID:        appID,
				Team:         team,
				Feature:      feature,
				CustomerTier: customerTier,
				SessionID:    sessionID,
				TraceID:      traceID,
				CacheHit:     true,
				TokenSummary: "cache_hit=true",
			}
			h.logger.Log(event)
			return
		}
	}

	// Restore the request body for the adapter.
	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	// For cacheable non-streaming requests, use a recorder to capture the response.
	var recorder *httptest.ResponseRecorder
	var targetWriter http.ResponseWriter
	if cacheable {
		recorder = httptest.NewRecorder()
		targetWriter = recorder
	} else {
		targetWriter = w
	}

	// Proxy the request to OpenAI.
	result, err := h.openai.Proxy(targetWriter, r)
	if err != nil {
		log.Printf("ERROR: proxy failed: %v", err)
		return
	}

	// If we used a recorder, copy the response to the real writer and cache it.
	if recorder != nil {
		recResult := recorder.Result()
		contentType := recResult.Header.Get("Content-Type")

		// Copy headers from recorder to real writer.
		for k, vv := range recResult.Header {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}

		// Add cache MISS header.
		w.Header().Set("X-CostTrack-Cache", "MISS")

		w.WriteHeader(recResult.StatusCode)
		respBody := recorder.Body.Bytes()
		w.Write(respBody)

		// Cache the response if the upstream returned 200.
		if recResult.StatusCode == http.StatusOK {
			cost := CalculateCost(
				"openai",
				result.Usage.Model,
				result.Usage.InputTokens,
				result.Usage.OutputTokens,
				result.Usage.CacheReadTokens,
				result.Usage.CacheWriteTokens,
			)
			h.cache.Set(cacheKey, CacheEntry{
				ResponseBody: respBody,
				ContentType:  contentType,
				Timestamp:    time.Now(),
				CostUSD:      cost,
			})
		}
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
		IsStreaming:  result.IsStream,
		AppID:        appID,
		Team:         team,
		Feature:      feature,
		CustomerTier: customerTier,
		SessionID:    sessionID,
		TraceID:      traceID,
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

// CacheStatsHandler returns cache statistics as JSON.
func CacheStatsHandler(cache *ResponseCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := cache.Stats()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}
