package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/costtrack/proxy/adapters"
	"github.com/costtrack/proxy/middleware"
)

func main() {
	// Load configuration.
	cfg, err := LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize the async event logger.
	eventLogger := NewEventLogger(cfg.CostEventsFile)

	// Initialize the Anthropic adapter.
	anthropicAdapter := adapters.NewAnthropicAdapter(cfg.AnthropicBaseURL)

	// Initialize the OpenAI adapter.
	openaiAdapter := adapters.NewOpenAIAdapter(cfg.OpenAIBaseURL)

	// Initialize the response cache.
	responseCache := NewResponseCache(cfg.CacheMaxEntries, cfg.CacheTTLSeconds, cfg.CacheEnabled)

	// Initialize the budget tracker.
	budgetsFile := cfg.DataDir + "/budgets.json"
	budgetTracker := NewBudgetTracker(budgetsFile, cfg.CostEventsFile)

	// Initialize the model router.
	modelRouter := NewModelRouter(cfg.RoutingFile)

	// Set up the HTTP mux.
	mux := http.NewServeMux()

	// Health and readiness endpoints.
	mux.HandleFunc("/healthz", HealthHandler)
	mux.HandleFunc("/readyz", ReadyHandler)

	// Stats endpoint.
	mux.HandleFunc("/stats", StatsHandler(eventLogger))

	// Cache stats endpoint.
	mux.HandleFunc("/cache/stats", CacheStatsHandler(responseCache))

	// Routing stats endpoint.
	mux.HandleFunc("/routing/stats", RoutingStatsHandler(modelRouter))

	// Proxy handler for LLM API routes.
	proxyHandler := NewProxyHandler(anthropicAdapter, openaiAdapter, eventLogger, budgetTracker, responseCache, modelRouter)
	mux.Handle("/v1/", proxyHandler)

	// Wrap with CORS middleware.
	handler := middleware.CORS(mux)

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Log startup info.
	log.Printf("CostTrack Proxy starting")
	log.Printf("  Port:           %d", cfg.Port)
	log.Printf("  Data directory: %s", cfg.DataDir)
	log.Printf("  Cost events:    %s", cfg.CostEventsFile)
	log.Printf("  Log level:      %s", cfg.LogLevel)
	log.Printf("  Budgets file:   %s", budgetsFile)
	log.Printf("  Providers:      anthropic (%s), openai (%s)", cfg.AnthropicBaseURL, cfg.OpenAIBaseURL)
	log.Printf("  Cache:          enabled=%v max_entries=%d ttl=%ds", cfg.CacheEnabled, cfg.CacheMaxEntries, cfg.CacheTTLSeconds)
	log.Printf("  Routing file:   %s", cfg.RoutingFile)

	// Graceful shutdown.
	errCh := make(chan error, 1)
	go func() {
		errCh <- server.ListenAndServe()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		log.Printf("Received signal %v, shutting down gracefully...", sig)
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}

	// Give in-flight requests 15 seconds to complete.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	// Close the response cache.
	responseCache.Close()

	// Close the model router.
	modelRouter.Close()

	// Close the budget tracker.
	budgetTracker.Close()

	// Flush and close the event logger.
	eventLogger.Close()
	log.Printf("CostTrack Proxy stopped")
}
