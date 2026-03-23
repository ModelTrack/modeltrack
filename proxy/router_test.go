package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func writeRoutingFile(t *testing.T, dir string, cfg RoutingConfig) string {
	t.Helper()
	path := filepath.Join(dir, "routing.json")
	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestRoute_BudgetDowngrade(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade-anthropic",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6", "claude-sonnet-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// Budget at 75% — should trigger downgrade.
	decision := router.Route("anthropic", "claude-sonnet-4-6", "product", "", 0.75)
	if !decision.Routed {
		t.Fatal("expected request to be routed")
	}
	if decision.NewModel != "claude-haiku-4-5" {
		t.Errorf("expected NewModel claude-haiku-4-5, got %q", decision.NewModel)
	}
	if decision.OriginalModel != "claude-sonnet-4-6" {
		t.Errorf("expected OriginalModel claude-sonnet-4-6, got %q", decision.OriginalModel)
	}
	if decision.Action != "downgrade" {
		t.Errorf("expected action downgrade, got %q", decision.Action)
	}
	if decision.RuleName != "budget-downgrade-anthropic" {
		t.Errorf("expected rule name budget-downgrade-anthropic, got %q", decision.RuleName)
	}
}

func TestRoute_BudgetUnderThreshold(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade-anthropic",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6", "claude-sonnet-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// Budget at 50% — should NOT trigger.
	decision := router.Route("anthropic", "claude-sonnet-4-6", "product", "", 0.50)
	if decision.Routed {
		t.Fatal("expected request NOT to be routed at 50% budget")
	}
}

func TestRoute_BlockExpensive(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "critical-budget-block",
				Trigger:    "budget_percent_above",
				Threshold:  90,
				FromModels: []string{"claude-opus-4-6", "gpt-4o"},
				ToModel:    "",
				Provider:   "",
				Action:     "block_expensive",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// Budget at 92% with expensive model.
	decision := router.Route("anthropic", "claude-opus-4-6", "product", "", 0.92)
	if !decision.Routed {
		t.Fatal("expected request to be routed (blocked)")
	}
	if decision.Action != "block_expensive" {
		t.Errorf("expected action block_expensive, got %q", decision.Action)
	}
}

func TestRoute_ProviderMismatch(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade-anthropic",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// OpenAI provider should not match anthropic rule.
	decision := router.Route("openai", "claude-opus-4-6", "product", "", 0.80)
	if decision.Routed {
		t.Fatal("expected request NOT to be routed for mismatched provider")
	}
}

func TestRoute_DisabledRule(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "disabled-rule",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    false,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	decision := router.Route("anthropic", "claude-opus-4-6", "product", "", 0.80)
	if decision.Routed {
		t.Fatal("expected disabled rule to NOT trigger")
	}
}

func TestRoute_ModelNotInFromList(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// claude-haiku-4-5 is not in from_models, should pass through.
	decision := router.Route("anthropic", "claude-haiku-4-5", "product", "", 0.80)
	if decision.Routed {
		t.Fatal("expected cheap model to NOT be routed")
	}
}

func TestRoute_FirstMatchWins(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "first-rule",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-sonnet-4-6",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
			{
				Name:       "second-rule",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	decision := router.Route("anthropic", "claude-opus-4-6", "product", "", 0.80)
	if decision.NewModel != "claude-sonnet-4-6" {
		t.Errorf("expected first rule to win (claude-sonnet-4-6), got %q", decision.NewModel)
	}
	if decision.RuleName != "first-rule" {
		t.Errorf("expected rule name first-rule, got %q", decision.RuleName)
	}
}

func TestRoute_NoRoutingFile(t *testing.T) {
	dir := t.TempDir()
	routingPath := filepath.Join(dir, "nonexistent.json")

	router := NewModelRouter(routingPath)
	defer router.Close()

	decision := router.Route("anthropic", "claude-opus-4-6", "product", "", 0.95)
	if decision.Routed {
		t.Fatal("expected no routing when file does not exist")
	}
}

func TestRoute_NoBudgetSet(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// budgetPct = 0.0 means no budget set — should not trigger.
	decision := router.Route("anthropic", "claude-opus-4-6", "product", "", 0.0)
	if decision.Routed {
		t.Fatal("expected no routing when budget percent is 0")
	}
}

func TestShouldSkipRouting(t *testing.T) {
	dir := t.TempDir()
	routingPath := filepath.Join(dir, "nonexistent.json")

	router := NewModelRouter(routingPath)
	defer router.Close()

	if !router.ShouldSkipRouting("true") {
		t.Error("expected ShouldSkipRouting to return true for 'true'")
	}
	if router.ShouldSkipRouting("false") {
		t.Error("expected ShouldSkipRouting to return false for 'false'")
	}
	if router.ShouldSkipRouting("") {
		t.Error("expected ShouldSkipRouting to return false for empty string")
	}
}

func TestGetStats(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"claude-opus-4-6"},
				ToModel:    "claude-haiku-4-5",
				Provider:   "anthropic",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	// Route a few requests.
	router.Route("anthropic", "claude-opus-4-6", "product", "", 0.80)
	router.Route("anthropic", "claude-opus-4-6", "product", "", 0.80)
	router.Route("anthropic", "claude-haiku-4-5", "product", "", 0.80) // no match

	stats := router.GetStats()

	if stats["total_routed"].(int64) != 2 {
		t.Errorf("expected total_routed=2, got %v", stats["total_routed"])
	}
	if stats["total_pass_through"].(int64) != 1 {
		t.Errorf("expected total_pass_through=1, got %v", stats["total_pass_through"])
	}

	ruleHits := stats["rule_hits"].(map[string]int64)
	if ruleHits["budget-downgrade"] != 2 {
		t.Errorf("expected rule_hits[budget-downgrade]=2, got %d", ruleHits["budget-downgrade"])
	}
}

func TestGetBudgetPercent(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 100.0, Action: "block"},
		{Team: "product", App: "app1", MonthlyLimit: 50.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	bt.RecordSpend("product", "app1", 35.0)

	// Team-level: 35/100 = 0.35
	pct := bt.GetBudgetPercent("product", "")
	if pct < 0.349 || pct > 0.351 {
		t.Errorf("expected ~0.35 for team, got %.4f", pct)
	}

	// App-level: 35/50 = 0.70
	pct = bt.GetBudgetPercent("product", "app1")
	if pct < 0.699 || pct > 0.701 {
		t.Errorf("expected ~0.70 for team+app, got %.4f", pct)
	}

	// Unknown team: 0.0
	pct = bt.GetBudgetPercent("unknown", "")
	if pct != 0.0 {
		t.Errorf("expected 0.0 for unknown team, got %.4f", pct)
	}
}

func TestRoute_OpenAIDowngrade(t *testing.T) {
	dir := t.TempDir()

	cfg := RoutingConfig{
		Rules: []RoutingRule{
			{
				Name:       "budget-downgrade-openai",
				Trigger:    "budget_percent_above",
				Threshold:  70,
				FromModels: []string{"gpt-4o", "gpt-4.1"},
				ToModel:    "gpt-4o-mini",
				Provider:   "openai",
				Action:     "downgrade",
				Enabled:    true,
			},
		},
		OptOutHeader:     "X-ModelTrack-No-Route",
		FallbackBehavior: "pass_through",
	}
	routingPath := writeRoutingFile(t, dir, cfg)

	router := NewModelRouter(routingPath)
	defer router.Close()

	decision := router.Route("openai", "gpt-4o", "product", "", 0.75)
	if !decision.Routed {
		t.Fatal("expected gpt-4o to be routed")
	}
	if decision.NewModel != "gpt-4o-mini" {
		t.Errorf("expected NewModel gpt-4o-mini, got %q", decision.NewModel)
	}

	decision = router.Route("openai", "gpt-4.1", "product", "", 0.75)
	if !decision.Routed {
		t.Fatal("expected gpt-4.1 to be routed")
	}
	if decision.NewModel != "gpt-4o-mini" {
		t.Errorf("expected NewModel gpt-4o-mini, got %q", decision.NewModel)
	}
}
