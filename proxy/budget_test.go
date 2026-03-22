package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeBudgetsFile(t *testing.T, dir string, budgets []BudgetEntry) string {
	t.Helper()
	path := filepath.Join(dir, "budgets.json")
	cfg := BudgetsConfig{Budgets: budgets}
	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func writeCostEvents(t *testing.T, dir string, events []CostEvent) string {
	t.Helper()
	path := filepath.Join(dir, "cost_events.jsonl")
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	for _, e := range events {
		if err := enc.Encode(e); err != nil {
			t.Fatal(err)
		}
	}
	return path
}

func TestCheckBudget_UnderBudget(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 100.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	bt.RecordSpend("product", "", 10.0)
	result := bt.CheckBudget("product", "")

	if result.Status != BudgetOK {
		t.Errorf("expected BudgetOK, got %d", result.Status)
	}
}

func TestCheckBudget_Warning(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 100.0, Action: "warn"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	bt.RecordSpend("product", "", 85.0)
	result := bt.CheckBudget("product", "")

	if result.Status != BudgetWarning {
		t.Errorf("expected BudgetWarning, got %d", result.Status)
	}
	if result.Action != "warn" {
		t.Errorf("expected action 'warn', got %q", result.Action)
	}
}

func TestCheckBudget_Exceeded(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "ml-research", App: "", MonthlyLimit: 500.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	bt.RecordSpend("ml-research", "", 550.0)
	result := bt.CheckBudget("ml-research", "")

	if result.Status != BudgetExceeded {
		t.Errorf("expected BudgetExceeded, got %d", result.Status)
	}
	if result.Action != "block" {
		t.Errorf("expected action 'block', got %q", result.Action)
	}
}

func TestCheckBudget_TeamAppSpecific(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "data-eng", App: "", MonthlyLimit: 200.0, Action: "warn"},
		{Team: "data-eng", App: "summarizer", MonthlyLimit: 50.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	bt.RecordSpend("data-eng", "summarizer", 55.0)

	// Check team+app specific: should be exceeded
	result := bt.CheckBudget("data-eng", "summarizer")
	if result.Status != BudgetExceeded {
		t.Errorf("expected BudgetExceeded for team+app, got %d", result.Status)
	}
	if result.MonthlyLimit != 50.0 {
		t.Errorf("expected limit 50, got %.2f", result.MonthlyLimit)
	}

	// Check team-only: should still be OK (55 out of 200)
	result = bt.CheckBudget("data-eng", "")
	if result.Status != BudgetOK {
		t.Errorf("expected BudgetOK for team-only, got %d", result.Status)
	}
}

func TestCheckBudget_NoMatchingBudget(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 100.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	result := bt.CheckBudget("unknown-team", "")
	if result.Status != BudgetOK {
		t.Errorf("expected BudgetOK for unknown team, got %d", result.Status)
	}
}

func TestCheckBudget_NoBudgetsFile(t *testing.T) {
	dir := t.TempDir()
	budgetsPath := filepath.Join(dir, "nonexistent.json")
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	result := bt.CheckBudget("product", "")
	if result.Status != BudgetOK {
		t.Errorf("expected BudgetOK when no budgets file, got %d", result.Status)
	}
}

func TestLoadCurrentMonthSpend(t *testing.T) {
	dir := t.TempDir()

	now := time.Now().UTC()
	thisMonth := now.Format(time.RFC3339Nano)
	// Create a timestamp from last month.
	lastMonth := now.AddDate(0, -1, 0).Format(time.RFC3339Nano)

	eventsPath := writeCostEvents(t, dir, []CostEvent{
		{EventID: "1", Timestamp: thisMonth, Team: "product", AppID: "app1", CostUSD: 10.0},
		{EventID: "2", Timestamp: thisMonth, Team: "product", AppID: "app1", CostUSD: 5.0},
		{EventID: "3", Timestamp: lastMonth, Team: "product", AppID: "app1", CostUSD: 100.0},
		{EventID: "4", Timestamp: thisMonth, Team: "ml-research", AppID: "", CostUSD: 20.0},
	})

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 100.0, Action: "block"},
		{Team: "product", App: "app1", MonthlyLimit: 50.0, Action: "block"},
		{Team: "ml-research", App: "", MonthlyLimit: 500.0, Action: "warn"},
	})

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	// product team total should be 15 (10 + 5), not 115
	result := bt.CheckBudget("product", "")
	if result.CurrentSpend != 15.0 {
		t.Errorf("expected product team spend 15.0, got %.2f", result.CurrentSpend)
	}

	// product:app1 should also be 15
	result = bt.CheckBudget("product", "app1")
	if result.CurrentSpend != 15.0 {
		t.Errorf("expected product:app1 spend 15.0, got %.2f", result.CurrentSpend)
	}

	// ml-research should be 20
	result = bt.CheckBudget("ml-research", "")
	if result.CurrentSpend != 20.0 {
		t.Errorf("expected ml-research spend 20.0, got %.2f", result.CurrentSpend)
	}
}

func TestRecordSpend_ThreadSafety(t *testing.T) {
	dir := t.TempDir()

	budgetsPath := writeBudgetsFile(t, dir, []BudgetEntry{
		{Team: "product", App: "", MonthlyLimit: 1000.0, Action: "block"},
	})
	eventsPath := filepath.Join(dir, "cost_events.jsonl")

	bt := NewBudgetTracker(budgetsPath, eventsPath)
	defer bt.Close()

	// Run concurrent RecordSpend calls.
	done := make(chan struct{})
	for i := 0; i < 100; i++ {
		go func() {
			bt.RecordSpend("product", "", 1.0)
			done <- struct{}{}
		}()
	}
	for i := 0; i < 100; i++ {
		<-done
	}

	result := bt.CheckBudget("product", "")
	if result.CurrentSpend != 100.0 {
		t.Errorf("expected spend 100.0 after 100 concurrent writes, got %.2f", result.CurrentSpend)
	}
}

func TestFormatWarningHeader(t *testing.T) {
	r := BudgetResult{
		Team:         "product",
		MonthlyLimit: 100.0,
		CurrentSpend: 85.0,
		Percent:      0.85,
	}
	header := r.FormatWarningHeader()
	expected := "Team 'product' at 85% of monthly budget ($85.00/$100.00)"
	if header != expected {
		t.Errorf("unexpected header:\n got: %s\nwant: %s", header, expected)
	}
}

func TestFormatExceededMessage(t *testing.T) {
	r := BudgetResult{
		Team:         "ml-research",
		MonthlyLimit: 500.0,
		CurrentSpend: 550.0,
	}
	msg := r.FormatExceededMessage()
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(msg), &parsed); err != nil {
		t.Fatalf("exceeded message is not valid JSON: %v", err)
	}
	errObj := parsed["error"].(map[string]interface{})
	if errObj["type"] != "budget_exceeded" {
		t.Errorf("expected type budget_exceeded, got %v", errObj["type"])
	}
}
