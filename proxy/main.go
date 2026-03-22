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

	// Set up the HTTP mux.
	mux := http.NewServeMux()

	// Health and readiness endpoints.
	mux.HandleFunc("/healthz", HealthHandler)
	mux.HandleFunc("/readyz", ReadyHandler)

	// Stats endpoint.
	mux.HandleFunc("/stats", StatsHandler(eventLogger))

	// Proxy handler for LLM API routes.
	proxyHandler := NewProxyHandler(anthropicAdapter, eventLogger)
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
	log.Printf("  Providers:      anthropic (%s)", cfg.AnthropicBaseURL)

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

	// Flush and close the event logger.
	eventLogger.Close()
	log.Printf("CostTrack Proxy stopped")
}
