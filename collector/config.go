package main

import (
	"fmt"
	"os"
	"strings"
)

// Config holds all collector configuration loaded from environment variables.
type Config struct {
	DataDir                  string
	AWSRegion                string
	EnableAWSCosts           bool
	EnableOpenCost           bool
	EnableGPUMetrics         bool
	OpenCostEndpoint         string
	CostExplorerGranularity  string
	CollectionTags           []string
	CostEventsFile           string
	CollectorStateFile       string
	NamespaceMapFile         string
}

// LoadConfig reads configuration from environment variables with sensible defaults.
func LoadConfig() (*Config, error) {
	cfg := &Config{
		DataDir:                 "../data",
		AWSRegion:               "us-east-1",
		EnableAWSCosts:          false,
		EnableOpenCost:          false,
		EnableGPUMetrics:        false,
		OpenCostEndpoint:        "http://opencost.opencost:9003",
		CostExplorerGranularity: "DAILY",
		CollectionTags:          []string{"team", "app", "environment"},
	}

	if v := os.Getenv("DATA_DIR"); v != "" {
		cfg.DataDir = v
	}

	if v := os.Getenv("AWS_REGION"); v != "" {
		cfg.AWSRegion = v
	}

	if v := os.Getenv("ENABLE_AWS_COSTS"); v != "" {
		cfg.EnableAWSCosts = v == "true" || v == "1"
	}

	if v := os.Getenv("ENABLE_OPENCOST"); v != "" {
		cfg.EnableOpenCost = v == "true" || v == "1"
	}

	if v := os.Getenv("ENABLE_GPU_METRICS"); v != "" {
		cfg.EnableGPUMetrics = v == "true" || v == "1"
	}

	if v := os.Getenv("OPENCOST_ENDPOINT"); v != "" {
		cfg.OpenCostEndpoint = v
	}

	if v := os.Getenv("COST_EXPLORER_GRANULARITY"); v != "" {
		v = strings.ToUpper(v)
		if v != "DAILY" && v != "HOURLY" {
			return nil, fmt.Errorf("invalid COST_EXPLORER_GRANULARITY %q: must be DAILY or HOURLY", v)
		}
		cfg.CostExplorerGranularity = v
	}

	if v := os.Getenv("COLLECTION_TAGS"); v != "" {
		tags := strings.Split(v, ",")
		cleaned := make([]string, 0, len(tags))
		for _, t := range tags {
			t = strings.TrimSpace(t)
			if t != "" {
				cleaned = append(cleaned, t)
			}
		}
		cfg.CollectionTags = cleaned
	}

	cfg.CostEventsFile = cfg.DataDir + "/cost_events.jsonl"
	cfg.CollectorStateFile = cfg.DataDir + "/collector_state.json"
	cfg.NamespaceMapFile = cfg.DataDir + "/namespace_map.json"

	// Ensure data directory exists.
	if err := os.MkdirAll(cfg.DataDir, 0o755); err != nil {
		return nil, fmt.Errorf("creating data directory %q: %w", cfg.DataDir, err)
	}

	return cfg, nil
}
