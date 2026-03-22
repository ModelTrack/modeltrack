package main

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all proxy configuration loaded from environment variables.
type Config struct {
	Port             int
	AnthropicBaseURL string
	OpenAIBaseURL    string
	DataDir          string
	LogLevel         string
	CostEventsFile   string
}

// LoadConfig reads configuration from environment variables with sensible defaults.
func LoadConfig() (*Config, error) {
	cfg := &Config{
		Port:             8080,
		AnthropicBaseURL: "https://api.anthropic.com",
		OpenAIBaseURL:    "https://api.openai.com",
		DataDir:          "../data",
		LogLevel:         "info",
	}

	if v := os.Getenv("PROXY_PORT"); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("invalid PROXY_PORT %q: %w", v, err)
		}
		cfg.Port = p
	}

	if v := os.Getenv("ANTHROPIC_BASE_URL"); v != "" {
		cfg.AnthropicBaseURL = v
	}

	if v := os.Getenv("OPENAI_BASE_URL"); v != "" {
		cfg.OpenAIBaseURL = v
	}

	if v := os.Getenv("DATA_DIR"); v != "" {
		cfg.DataDir = v
	}

	if v := os.Getenv("LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}

	cfg.CostEventsFile = cfg.DataDir + "/cost_events.jsonl"

	// Ensure data directory exists.
	if err := os.MkdirAll(cfg.DataDir, 0o755); err != nil {
		return nil, fmt.Errorf("creating data directory %q: %w", cfg.DataDir, err)
	}

	return cfg, nil
}

// Addr returns the listen address string.
func (c *Config) Addr() string {
	return fmt.Sprintf(":%d", c.Port)
}
