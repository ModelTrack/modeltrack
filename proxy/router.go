package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

// RoutingRule defines a single model routing rule.
type RoutingRule struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Trigger     string   `json:"trigger"`
	Threshold   float64  `json:"threshold"`
	FromModels  []string `json:"from_models"`
	ToModel     string   `json:"to_model"`
	Provider    string   `json:"provider"`
	Action      string   `json:"action"` // "downgrade" or "block_expensive"
	Enabled     bool     `json:"enabled"`
}

// RoutingConfig is the top-level structure of routing.json.
type RoutingConfig struct {
	Rules            []RoutingRule `json:"rules"`
	OptOutHeader     string        `json:"opt_out_header"`
	FallbackBehavior string        `json:"fallback_behavior"`
}

// RoutingDecision is the result of a routing evaluation.
type RoutingDecision struct {
	Routed        bool
	OriginalModel string
	NewModel      string
	RuleName      string
	Reason        string
	Action        string // "downgrade", "block_expensive", or ""
}

// RoutingStats holds counters for routing activity.
type RoutingStats struct {
	TotalRouted      int64
	TotalPassThrough int64
	TotalBlocked     int64
	RuleHits         sync.Map // rule name -> *int64
	EstSavingsUSD    uint64   // stored as cost * 1e9 for atomic ops
}

// ModelRouter evaluates routing rules and decides whether to reroute requests.
type ModelRouter struct {
	mu           sync.RWMutex
	config       RoutingConfig
	routingFile  string
	stats        RoutingStats
	stopReload   chan struct{}
	reloadDone   chan struct{}
}

// NewModelRouter creates a router, loads routing.json, and starts periodic reload.
func NewModelRouter(routingFile string) *ModelRouter {
	mr := &ModelRouter{
		routingFile: routingFile,
		stopReload:  make(chan struct{}),
		reloadDone:  make(chan struct{}),
		config: RoutingConfig{
			OptOutHeader:     "X-ModelTrack-No-Route",
			FallbackBehavior: "pass_through",
		},
	}

	mr.loadConfig()
	go mr.reloadLoop()

	return mr
}

// loadConfig reads the routing.json configuration file.
func (mr *ModelRouter) loadConfig() {
	data, err := os.ReadFile(mr.routingFile)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("ROUTER: no routing file at %s, routing disabled", mr.routingFile)
		} else {
			log.Printf("ROUTER: error reading routing file: %v", err)
		}
		mr.mu.Lock()
		mr.config.Rules = nil
		mr.mu.Unlock()
		return
	}

	var cfg RoutingConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("ROUTER: error parsing routing file: %v", err)
		return
	}

	if cfg.OptOutHeader == "" {
		cfg.OptOutHeader = "X-ModelTrack-No-Route"
	}
	if cfg.FallbackBehavior == "" {
		cfg.FallbackBehavior = "pass_through"
	}

	mr.mu.Lock()
	mr.config = cfg
	mr.mu.Unlock()

	enabledCount := 0
	for _, r := range cfg.Rules {
		if r.Enabled {
			enabledCount++
		}
	}
	log.Printf("ROUTER: loaded %d routing rules (%d enabled) from %s", len(cfg.Rules), enabledCount, mr.routingFile)
}

// reloadLoop periodically reloads the routing.json file.
func (mr *ModelRouter) reloadLoop() {
	defer close(mr.reloadDone)
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			mr.loadConfig()
		case <-mr.stopReload:
			return
		}
	}
}

// Close stops the background reload goroutine.
func (mr *ModelRouter) Close() {
	close(mr.stopReload)
	<-mr.reloadDone
}

// Route evaluates routing rules and returns a decision.
// budgetPct is in the range 0.0 to 1.0+ (fraction of budget used).
func (mr *ModelRouter) Route(provider, model, team, app string, budgetPct float64) RoutingDecision {
	mr.mu.RLock()
	rules := mr.config.Rules
	mr.mu.RUnlock()

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		// Check if the model is in the from_models list.
		if !stringInSlice(model, rule.FromModels) {
			continue
		}

		// Check provider match (empty provider in rule matches any).
		if rule.Provider != "" && rule.Provider != provider {
			continue
		}

		// Evaluate trigger.
		switch rule.Trigger {
		case "budget_percent_above":
			// threshold is in percent (e.g. 70 means 70%), budgetPct is fraction (0.7).
			if budgetPct*100 < rule.Threshold {
				continue
			}
		default:
			// Unknown trigger type, skip.
			continue
		}

		// Rule matched.
		mr.recordRuleHit(rule.Name)

		switch rule.Action {
		case "block_expensive":
			atomic.AddInt64(&mr.stats.TotalBlocked, 1)
			return RoutingDecision{
				Routed:        true,
				OriginalModel: model,
				NewModel:      "",
				RuleName:      rule.Name,
				Reason:        fmt.Sprintf("budget at %.0f%%, rule %q", budgetPct*100, rule.Name),
				Action:        "block_expensive",
			}
		case "downgrade":
			atomic.AddInt64(&mr.stats.TotalRouted, 1)
			return RoutingDecision{
				Routed:        true,
				OriginalModel: model,
				NewModel:      rule.ToModel,
				RuleName:      rule.Name,
				Reason:        fmt.Sprintf("budget at %.0f%%, rule %q", budgetPct*100, rule.Name),
				Action:        "downgrade",
			}
		}
	}

	// No rule matched — pass through.
	atomic.AddInt64(&mr.stats.TotalPassThrough, 1)
	return RoutingDecision{
		Routed:        false,
		OriginalModel: model,
		NewModel:      model,
	}
}

// ShouldSkipRouting returns true if the opt-out header is set.
func (mr *ModelRouter) ShouldSkipRouting(headerValue string) bool {
	return headerValue == "true"
}

// GetOptOutHeader returns the configured opt-out header name.
func (mr *ModelRouter) GetOptOutHeader() string {
	mr.mu.RLock()
	defer mr.mu.RUnlock()
	return mr.config.OptOutHeader
}

// GetStats returns a snapshot of routing statistics.
func (mr *ModelRouter) GetStats() map[string]interface{} {
	totalRouted := atomic.LoadInt64(&mr.stats.TotalRouted)
	totalPassThrough := atomic.LoadInt64(&mr.stats.TotalPassThrough)
	totalBlocked := atomic.LoadInt64(&mr.stats.TotalBlocked)
	savingsFixed := atomic.LoadUint64(&mr.stats.EstSavingsUSD)

	ruleHits := make(map[string]int64)
	mr.stats.RuleHits.Range(func(key, value interface{}) bool {
		ruleHits[key.(string)] = atomic.LoadInt64(value.(*int64))
		return true
	})

	return map[string]interface{}{
		"total_routed":        totalRouted,
		"total_pass_through":  totalPassThrough,
		"total_blocked":       totalBlocked,
		"rule_hits":           ruleHits,
		"estimated_savings":   float64(savingsFixed) / 1e9,
	}
}

// RecordSavings records an estimated cost saving from a routing decision.
func (mr *ModelRouter) RecordSavings(savings float64) {
	if savings > 0 {
		savingsFixed := uint64(savings * 1e9)
		atomic.AddUint64(&mr.stats.EstSavingsUSD, savingsFixed)
	}
}

func (mr *ModelRouter) recordRuleHit(ruleName string) {
	val, _ := mr.stats.RuleHits.LoadOrStore(ruleName, new(int64))
	atomic.AddInt64(val.(*int64), 1)
}

func stringInSlice(s string, slice []string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}
