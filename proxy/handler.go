package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/modeltrack/proxy/adapters"
	"github.com/google/uuid"
)

// ProxyHandler is the main HTTP handler that routes requests to provider adapters.
type ProxyHandler struct {
	anthropic *adapters.AnthropicAdapter
	openai    *adapters.OpenAIAdapter
	bedrock   *adapters.BedrockAdapter
	azure     *adapters.AzureOpenAIAdapter
	logger    *EventLogger
	budget    *BudgetTracker
	cache     *ResponseCache
	router    *ModelRouter
}

// NewProxyHandler creates a new handler with the given adapters, logger, budget tracker, cache, and router.
func NewProxyHandler(anthropic *adapters.AnthropicAdapter, openai *adapters.OpenAIAdapter, logger *EventLogger, budget *BudgetTracker, cache *ResponseCache, router *ModelRouter) *ProxyHandler {
	return &ProxyHandler{
		anthropic: anthropic,
		openai:    openai,
		logger:    logger,
		budget:    budget,
		cache:     cache,
		router:    router,
	}
}

// SetBedrockAdapter sets the optional Bedrock adapter.
func (h *ProxyHandler) SetBedrockAdapter(b *adapters.BedrockAdapter) {
	h.bedrock = b
}

// SetAzureAdapter sets the optional Azure OpenAI adapter.
func (h *ProxyHandler) SetAzureAdapter(a *adapters.AzureOpenAIAdapter) {
	h.azure = a
}

// llmRequestFields holds the fields parsed from the request body needed for caching.
type llmRequestFields struct {
	Model       string          `json:"model"`
	Messages    json.RawMessage `json:"messages"`
	System      json.RawMessage `json:"system,omitempty"` // Anthropic top-level system field
	Stream      bool            `json:"stream"`
	Temperature *float64        `json:"temperature,omitempty"`
}

// promptAnalysis holds extracted prompt fingerprint data for cost analysis.
type promptAnalysis struct {
	PromptHash         string
	SystemPromptTokens int
	UserPromptTokens   int
	PromptTemplateID   string
}

// chatMessage represents a single message in a chat messages array.
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// requestAttribution holds all X-ModelTrack-* header values.
type requestAttribution struct {
	AppID, Team, Feature, CustomerTier, SessionID, TraceID, PromptTemplateID string
}

// extractAttribution extracts X-ModelTrack-* headers from the request.
func extractAttribution(r *http.Request) requestAttribution {
	return requestAttribution{
		AppID:            r.Header.Get("X-ModelTrack-App"),
		Team:             r.Header.Get("X-ModelTrack-Team"),
		Feature:          r.Header.Get("X-ModelTrack-Feature"),
		CustomerTier:     r.Header.Get("X-ModelTrack-Customer-Tier"),
		SessionID:        r.Header.Get("X-ModelTrack-Session-ID"),
		TraceID:          r.Header.Get("X-ModelTrack-Trace-ID"),
		PromptTemplateID: r.Header.Get("X-ModelTrack-Prompt-Template"),
	}
}

// estimateTokens returns a rough token count using chars/4 approximation.
func estimateTokens(text string) int {
	if len(text) == 0 {
		return 0
	}
	return (len(text) + 3) / 4
}

// hashPrompt returns the first 8 hex chars of the SHA-256 hash of the input.
func hashPrompt(content string) string {
	if content == "" {
		return ""
	}
	h := sha256.Sum256([]byte(content))
	return hex.EncodeToString(h[:])[:8]
}

// extractPromptAnalysis parses messages to extract prompt fingerprint data.
// provider should be "anthropic" or "openai".
func extractPromptAnalysis(fields *llmRequestFields, provider string, templateHeader string) promptAnalysis {
	pa := promptAnalysis{
		PromptTemplateID: templateHeader,
	}

	var systemContent string
	var userTokens int

	// For Anthropic, the system prompt can be in the top-level "system" field.
	if provider == ProviderAnthropic && len(fields.System) > 0 {
		// Try parsing as a plain string first.
		var sysStr string
		if err := json.Unmarshal(fields.System, &sysStr); err == nil {
			systemContent = sysStr
		}
	}

	// Parse messages array for system/user messages.
	if len(fields.Messages) > 0 {
		var msgs []chatMessage
		if err := json.Unmarshal(fields.Messages, &msgs); err == nil {
			for _, msg := range msgs {
				switch msg.Role {
				case "system":
					// Accumulate system content (for OpenAI; also fallback for Anthropic).
					if systemContent == "" {
						systemContent = msg.Content
					} else {
						systemContent += "\n" + msg.Content
					}
				case "user":
					userTokens += estimateTokens(msg.Content)
				}
			}
		}
	}

	pa.SystemPromptTokens = estimateTokens(systemContent)
	pa.UserPromptTokens = userTokens
	pa.PromptHash = hashPrompt(systemContent)

	return pa
}

// ServeHTTP routes requests to the appropriate provider adapter.
func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/v1/messages":
		h.handleAnthropicMessages(w, r)
	case "/v1/chat/completions":
		h.handleOpenAIChatCompletions(w, r)
	case "/bedrock/v1/messages":
		h.handleBedrockMessages(w, r)
	case "/azure/v1/chat/completions":
		h.handleAzureChatCompletions(w, r)
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
	// Don't cache if X-ModelTrack-No-Cache header is set.
	if r.Header.Get("X-ModelTrack-No-Cache") == "true" {
		return false
	}
	// Don't cache if temperature > 0 (non-deterministic).
	if fields.Temperature != nil && *fields.Temperature > 0 {
		return false
	}
	return true
}

// promptAnalysisProvider returns the provider string to use for prompt analysis.
// Bedrock uses the Anthropic message format, Azure uses the OpenAI format.
func promptAnalysisProvider(provider string) string {
	switch provider {
	case ProviderBedrock:
		return ProviderAnthropic
	case ProviderAzure:
		return ProviderOpenAI
	default:
		return provider
	}
}

// routingProvider returns the provider string to use for routing decisions.
// Bedrock routes as Anthropic, Azure routes as OpenAI.
func routingProvider(provider string) string {
	switch provider {
	case ProviderBedrock:
		return ProviderAnthropic
	case ProviderAzure:
		return ProviderOpenAI
	default:
		return provider
	}
}

// handleAnthropicMessages proxies requests to the Anthropic Messages API.
func (h *ProxyHandler) handleAnthropicMessages(w http.ResponseWriter, r *http.Request) {
	h.handleLLMRequest(w, r, ProviderAnthropic, h.anthropic)
}

// handleOpenAIChatCompletions proxies requests to the OpenAI Chat Completions API.
func (h *ProxyHandler) handleOpenAIChatCompletions(w http.ResponseWriter, r *http.Request) {
	h.handleLLMRequest(w, r, ProviderOpenAI, h.openai)
}

// handleBedrockMessages proxies requests to AWS Bedrock via the Anthropic Messages format.
func (h *ProxyHandler) handleBedrockMessages(w http.ResponseWriter, r *http.Request) {
	if h.bedrock == nil {
		http.Error(w, `{"error":"bedrock adapter not configured — set BEDROCK_ENDPOINT_URL"}`, http.StatusServiceUnavailable)
		return
	}
	h.handleLLMRequest(w, r, ProviderBedrock, h.bedrock)
}

// handleAzureChatCompletions proxies requests to Azure OpenAI in OpenAI format.
func (h *ProxyHandler) handleAzureChatCompletions(w http.ResponseWriter, r *http.Request) {
	if h.azure == nil {
		http.Error(w, `{"error":"azure adapter not configured — set AZURE_OPENAI_ENDPOINT"}`, http.StatusServiceUnavailable)
		return
	}
	h.handleLLMRequest(w, r, ProviderAzure, h.azure)
}

// handleLLMRequest is the unified handler for all LLM provider requests.
// It implements the complete request lifecycle: attribution extraction, budget checks,
// body parsing, prompt analysis, routing, caching, proxying, cost calculation, and logging.
func (h *ProxyHandler) handleLLMRequest(w http.ResponseWriter, r *http.Request, provider string, adapter adapters.ProviderAdapter) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract ModelTrack attribution headers.
	attr := extractAttribution(r)

	// Check budget before forwarding the request.
	if h.budget != nil && attr.Team != "" {
		budgetResult := h.budget.CheckBudget(attr.Team, attr.AppID)
		if budgetResult.Status == BudgetExceeded && budgetResult.Action == "block" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(budgetResult.FormatExceededMessage()))
			return
		}
		if budgetResult.Status == BudgetWarning || (budgetResult.Status == BudgetExceeded && budgetResult.Action == "warn") {
			w.Header().Set("X-ModelTrack-Budget-Warning", budgetResult.FormatWarningHeader())
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

	// Parse fields needed for caching and routing.
	var fields llmRequestFields
	if err := json.Unmarshal(bodyBytes, &fields); err != nil {
		log.Printf("ERROR: parsing request body: %v", err)
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Extract prompt analysis (fingerprint, token breakdown).
	pa := extractPromptAnalysis(&fields, promptAnalysisProvider(provider), attr.PromptTemplateID)

	// --- Model routing ---
	routeProvider := routingProvider(provider)
	var routingDecision RoutingDecision
	if h.router != nil && !h.router.ShouldSkipRouting(r.Header.Get(h.router.GetOptOutHeader())) {
		budgetPct := 0.0
		if h.budget != nil && attr.Team != "" {
			budgetPct = h.budget.GetBudgetPercent(attr.Team, attr.AppID)
		}

		routingDecision = h.router.Route(routeProvider, fields.Model, attr.Team, attr.AppID, budgetPct)

		if routingDecision.Routed {
			if routingDecision.Action == "block_expensive" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				msg := fmt.Sprintf(
					`{"error":{"type":"model_blocked","message":"Expensive model blocked: team at %.0f%% of budget. Use %s instead."}}`,
					budgetPct*100, suggestCheapModel(routeProvider))
				w.Write([]byte(msg))
				return
			}

			// Downgrade: rewrite the model in the request body.
			var bodyMap map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &bodyMap); err != nil {
				log.Printf("ERROR: re-parsing request body for routing: %v", err)
				http.Error(w, `{"error":"failed to process request body"}`, http.StatusInternalServerError)
				return
			}
			bodyMap["model"] = routingDecision.NewModel
			newBody, err := json.Marshal(bodyMap)
			if err != nil {
				log.Printf("ERROR: re-marshaling request body for routing: %v", err)
				http.Error(w, `{"error":"failed to process request body"}`, http.StatusInternalServerError)
				return
			}
			bodyBytes = newBody
			fields.Model = routingDecision.NewModel

			// Set routing response headers.
			w.Header().Set("X-ModelTrack-Routed", "true")
			w.Header().Set("X-ModelTrack-Original-Model", routingDecision.OriginalModel)
			w.Header().Set("X-ModelTrack-Routed-To", routingDecision.NewModel)
			w.Header().Set("X-ModelTrack-Route-Reason", routingDecision.Reason)

			log.Printf("ROUTER: routed %s -> %s for team %q (rule: %s)",
				routingDecision.OriginalModel, routingDecision.NewModel, attr.Team, routingDecision.RuleName)
		}
	}

	cacheable := h.isCacheable(r, &fields)
	var cacheKey string

	// Check cache for a hit.
	if cacheable {
		cacheKey = GenerateKey(provider, fields.Model, fields.Messages)

		if entry, ok := h.cache.Get(cacheKey); ok {
			// Cache HIT — return cached response directly.
			w.Header().Set("Content-Type", entry.ContentType)
			w.Header().Set("X-ModelTrack-Cache", "HIT")
			w.Header().Set("X-ModelTrack-Cache-Savings", fmt.Sprintf("$%.4f", entry.CostUSD))
			w.WriteHeader(http.StatusOK)
			w.Write(entry.ResponseBody)

			// Log cache hit event.
			event := CostEvent{
				EventID:            uuid.New().String(),
				Timestamp:          time.Now().UTC().Format(time.RFC3339Nano),
				Provider:           provider,
				Model:              fields.Model,
				CostUSD:            0,
				StatusCode:         http.StatusOK,
				IsStreaming:        false,
				AppID:              attr.AppID,
				Team:               attr.Team,
				Feature:            attr.Feature,
				CustomerTier:       attr.CustomerTier,
				SessionID:          attr.SessionID,
				TraceID:            attr.TraceID,
				CacheHit:           true,
				RoutedFrom:         routingDecision.OriginalModel,
				RoutedTo:           routedToField(routingDecision),
				RoutingRule:        routingDecision.RuleName,
				TokenSummary:       "cache_hit=true",
				PromptHash:         pa.PromptHash,
				SystemPromptTokens: pa.SystemPromptTokens,
				UserPromptTokens:   pa.UserPromptTokens,
				PromptTemplateID:   pa.PromptTemplateID,
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

	// Proxy the request to the provider.
	result, err := adapter.Proxy(targetWriter, r)
	if err != nil {
		log.Printf("ERROR: %s proxy failed: %v", provider, err)
		return
	}

	// Calculate cost.
	cost := CalculateCost(
		provider,
		result.Usage.Model,
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
		result.Usage.CacheReadTokens,
		result.Usage.CacheWriteTokens,
	)

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
		w.Header().Set("X-ModelTrack-Cache", "MISS")

		w.WriteHeader(recResult.StatusCode)
		respBody := recorder.Body.Bytes()
		w.Write(respBody)

		// Cache the response if the upstream returned 200.
		if recResult.StatusCode == http.StatusOK {
			h.cache.Set(cacheKey, CacheEntry{
				ResponseBody: respBody,
				ContentType:  contentType,
				Timestamp:    time.Now(),
				CostUSD:      cost,
			})
		}
	}

	// Build token summary.
	summary := fmt.Sprintf("in=%d out=%d cache_read=%d cache_write=%d",
		result.Usage.InputTokens,
		result.Usage.OutputTokens,
		result.Usage.CacheReadTokens,
		result.Usage.CacheWriteTokens,
	)

	// Log the cost event asynchronously.
	event := CostEvent{
		EventID:            uuid.New().String(),
		Timestamp:          time.Now().UTC().Format(time.RFC3339Nano),
		Provider:           provider,
		Model:              result.Usage.Model,
		InputTokens:        result.Usage.InputTokens,
		OutputTokens:       result.Usage.OutputTokens,
		CacheReadTokens:    result.Usage.CacheReadTokens,
		CacheWriteTokens:   result.Usage.CacheWriteTokens,
		CostUSD:            cost,
		LatencyMs:          result.LatencyMs,
		StatusCode:         result.StatusCode,
		IsStreaming:        result.IsStream,
		AppID:              attr.AppID,
		Team:               attr.Team,
		Feature:            attr.Feature,
		CustomerTier:       attr.CustomerTier,
		SessionID:          attr.SessionID,
		TraceID:            attr.TraceID,
		RoutedFrom:         routingDecision.OriginalModel,
		RoutedTo:           routedToField(routingDecision),
		RoutingRule:        routingDecision.RuleName,
		TokenSummary:       summary,
		PromptHash:         pa.PromptHash,
		SystemPromptTokens: pa.SystemPromptTokens,
		UserPromptTokens:   pa.UserPromptTokens,
		PromptTemplateID:   pa.PromptTemplateID,
	}

	h.logger.Log(event)

	// Record estimated routing savings.
	if routingDecision.Routed && routingDecision.Action == "downgrade" && h.router != nil {
		originalCost := CalculateCost(provider, routingDecision.OriginalModel,
			result.Usage.InputTokens, result.Usage.OutputTokens,
			result.Usage.CacheReadTokens, result.Usage.CacheWriteTokens)
		if originalCost > cost {
			h.router.RecordSavings(originalCost - cost)
		}
	}

	// Update budget tracker and add warning headers if needed.
	if h.budget != nil && attr.Team != "" {
		h.budget.RecordSpend(attr.Team, attr.AppID, cost)
		budgetResult := h.budget.CheckBudget(attr.Team, attr.AppID)
		if budgetResult.Status == BudgetWarning {
			w.Header().Set("X-ModelTrack-Budget-Warning", budgetResult.FormatWarningHeader())
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

// RoutingStatsHandler returns routing statistics as JSON.
func RoutingStatsHandler(router *ModelRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := router.GetStats()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}

// suggestCheapModel returns a suggested cheap model for a given provider.
func suggestCheapModel(provider string) string {
	switch provider {
	case ProviderAnthropic:
		return "claude-haiku-4-5"
	case ProviderOpenAI, ProviderAzure:
		return "gpt-4o-mini"
	case ProviderBedrock:
		return "anthropic.claude-3-5-haiku-20241022-v1:0"
	default:
		return "a cheaper model"
	}
}

// routedToField returns the RoutedTo value for logging, or empty string if not routed.
func routedToField(d RoutingDecision) string {
	if d.Routed && d.Action == "downgrade" {
		return d.NewModel
	}
	return ""
}
