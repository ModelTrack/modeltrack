package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmsgprefix)
	log.SetPrefix("[collector] ")

	cfg, err := LoadConfig()
	if err != nil {
		log.Fatalf("FATAL: failed to load config: %v", err)
	}

	writer := NewEventWriter(cfg.CostEventsFile)

	log.Printf("INFO: ModelTrack Collector starting")
	log.Printf("INFO: data directory: %s", cfg.DataDir)
	log.Printf("INFO: cost events file: %s", cfg.CostEventsFile)
	log.Printf("INFO: collectors enabled — AWS Cost Explorer: %v, OpenCost: %v, GPU Metrics: %v",
		cfg.EnableAWSCosts, cfg.EnableOpenCost, cfg.EnableGPUMetrics)

	if !cfg.EnableAWSCosts && !cfg.EnableOpenCost && !cfg.EnableGPUMetrics {
		log.Printf("WARN: no collectors are enabled — set ENABLE_AWS_COSTS, ENABLE_OPENCOST, or ENABLE_GPU_METRICS to true")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	var wg sync.WaitGroup

	// AWS Cost Explorer collection loop — every 1 hour.
	if cfg.EnableAWSCosts {
		awsCollector, err := NewAWSCostCollector(cfg, writer)
		if err != nil {
			log.Printf("WARN: could not initialize AWS Cost Explorer collector (no credentials?): %v", err)
		} else {
			wg.Add(1)
			go func() {
				defer wg.Done()
				runCollectionLoop(ctx, "AWS Cost Explorer", 1*time.Hour, func(ctx context.Context) error {
					return awsCollector.Collect(ctx)
				})
			}()
		}
	}

	// OpenCost collection loop — every 5 minutes.
	if cfg.EnableOpenCost {
		ocCollector := NewOpenCostCollector(cfg, writer)
		wg.Add(1)
		go func() {
			defer wg.Done()
			runCollectionLoop(ctx, "OpenCost", 5*time.Minute, func(ctx context.Context) error {
				return ocCollector.Collect(ctx)
			})
		}()
	}

	// CloudWatch GPU metrics collection loop — every 5 minutes.
	if cfg.EnableGPUMetrics {
		gpuCollector, err := NewGPUMetricsCollector(cfg, writer)
		if err != nil {
			log.Printf("WARN: could not initialize GPU metrics collector (no credentials?): %v", err)
		} else {
			wg.Add(1)
			go func() {
				defer wg.Done()
				runCollectionLoop(ctx, "CloudWatch GPU Metrics", 5*time.Minute, func(ctx context.Context) error {
					return gpuCollector.Collect(ctx)
				})
			}()
		}
	}

	// Wait for shutdown signal.
	<-sigCh
	log.Printf("INFO: shutting down collectors...")
	cancel()
	wg.Wait()
	log.Printf("INFO: collector stopped")
}

// runCollectionLoop runs a collector function on a periodic interval.
// It performs an initial collection immediately, then repeats on the given interval.
// All errors are logged but never crash the process.
func runCollectionLoop(ctx context.Context, name string, interval time.Duration, collect func(ctx context.Context) error) {
	log.Printf("INFO: starting %s collection loop (interval: %v)", name, interval)

	// Initial collection.
	if err := collectSafely(ctx, name, collect); err != nil {
		log.Printf("ERROR: %s initial collection failed: %v", name, err)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("INFO: %s collection loop stopped", name)
			return
		case <-ticker.C:
			if err := collectSafely(ctx, name, collect); err != nil {
				log.Printf("ERROR: %s collection failed: %v", name, err)
			}
		}
	}
}

// collectSafely wraps a collection call with panic recovery.
func collectSafely(ctx context.Context, name string, collect func(ctx context.Context) error) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = log.Output(2, "")
			log.Printf("ERROR: %s collector panicked: %v", name, r)
		}
	}()

	collectCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	return collect(collectCtx)
}
