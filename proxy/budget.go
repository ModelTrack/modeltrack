package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"
)

// BudgetStatus represents the result of a budget check.
type BudgetStatus int

const (
	BudgetOK       BudgetStatus = iota
	BudgetWarning               // over soft limit (default 80%)
	BudgetExceeded              // over hard limit (100%)
)

// BudgetEntry represents a single budget rule from budgets.json.
type BudgetEntry struct {
	Team         string  `json:"team"`
	App          string  `json:"app"`
	MonthlyLimit float64 `json:"monthly_limit"`
	Action       string  `json:"action"` // "warn" or "block"
}

// BudgetsConfig is the top-level structure of budgets.json.
type BudgetsConfig struct {
	Budgets []BudgetEntry `json:"budgets"`
}

// BudgetResult is the outcome of a budget check for a request.
type BudgetResult struct {
	Status       BudgetStatus
	Action       string  // "warn" or "block"
	Team         string
	App          string
	MonthlyLimit float64
	CurrentSpend float64
	Percent      float64
}

// BudgetTracker tracks cumulative spend and enforces budget limits.
type BudgetTracker struct {
	mu             sync.RWMutex
	spend          map[string]float64 // key: "team" or "team:app"
	budgets        []BudgetEntry
	budgetsFile    string
	costEventsFile string
	warningPct     float64 // fraction at which warning triggers (default 0.8)
	stopReload     chan struct{}
	reloadDone     chan struct{}
}

// NewBudgetTracker creates a budget tracker, loads current month spend from
// the cost events file, loads budget rules, and starts periodic reload.
func NewBudgetTracker(budgetsFile, costEventsFile string) *BudgetTracker {
	bt := &BudgetTracker{
		spend:          make(map[string]float64),
		budgetsFile:    budgetsFile,
		costEventsFile: costEventsFile,
		warningPct:     0.80,
		stopReload:     make(chan struct{}),
		reloadDone:     make(chan struct{}),
	}

	bt.loadCurrentMonthSpend()
	bt.loadBudgets()
	go bt.reloadLoop()

	return bt
}

// budgetKey returns the map key for a team or team+app pair.
func budgetKey(team, app string) string {
	if app == "" {
		return team
	}
	return team + ":" + app
}

// loadCurrentMonthSpend reads the JSONL cost events file and sums costs
// for events in the current calendar month (UTC).
func (bt *BudgetTracker) loadCurrentMonthSpend() {
	f, err := os.Open(bt.costEventsFile)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("BUDGET: no cost events file yet, starting with zero spend")
			return
		}
		log.Printf("BUDGET: error opening cost events file: %v", err)
		return
	}
	defer f.Close()

	now := time.Now().UTC()
	monthPrefix := now.Format("2006-01")

	spend := make(map[string]float64)
	scanner := bufio.NewScanner(f)
	// Increase buffer for potentially long lines.
	scanner.Buffer(make([]byte, 0, 256*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		// Quick prefix check before full parse.
		if !strings.Contains(string(line), monthPrefix) {
			continue
		}

		var event struct {
			Timestamp string  `json:"timestamp"`
			Team      string  `json:"team"`
			AppID     string  `json:"app_id"`
			CostUSD   float64 `json:"cost_usd"`
		}
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}

		ts, err := time.Parse(time.RFC3339Nano, event.Timestamp)
		if err != nil {
			continue
		}
		if ts.Year() != now.Year() || ts.Month() != now.Month() {
			continue
		}

		if event.Team != "" {
			spend[budgetKey(event.Team, "")] += event.CostUSD
			if event.AppID != "" {
				spend[budgetKey(event.Team, event.AppID)] += event.CostUSD
			}
		}
	}

	bt.mu.Lock()
	bt.spend = spend
	bt.mu.Unlock()

	log.Printf("BUDGET: loaded current month spend for %d keys", len(spend))
}

// loadBudgets reads the budgets.json configuration file.
func (bt *BudgetTracker) loadBudgets() {
	data, err := os.ReadFile(bt.budgetsFile)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("BUDGET: no budgets file at %s, enforcement disabled", bt.budgetsFile)
		} else {
			log.Printf("BUDGET: error reading budgets file: %v", err)
		}
		bt.mu.Lock()
		bt.budgets = nil
		bt.mu.Unlock()
		return
	}

	var cfg BudgetsConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("BUDGET: error parsing budgets file: %v", err)
		return
	}

	bt.mu.Lock()
	bt.budgets = cfg.Budgets
	bt.mu.Unlock()

	log.Printf("BUDGET: loaded %d budget rules from %s", len(cfg.Budgets), bt.budgetsFile)
}

// reloadLoop periodically reloads the budgets.json file.
func (bt *BudgetTracker) reloadLoop() {
	defer close(bt.reloadDone)
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			bt.loadBudgets()
		case <-bt.stopReload:
			return
		}
	}
}

// Close stops the background reload goroutine.
func (bt *BudgetTracker) Close() {
	close(bt.stopReload)
	<-bt.reloadDone
}

// RecordSpend adds cost to the running totals for the given team and app.
func (bt *BudgetTracker) RecordSpend(team, app string, cost float64) {
	if team == "" {
		return
	}

	bt.mu.Lock()
	defer bt.mu.Unlock()

	bt.spend[budgetKey(team, "")] += cost
	if app != "" {
		bt.spend[budgetKey(team, app)] += cost
	}
}

// CheckBudget checks whether the given team/app is within budget.
// It checks the most specific matching budget rule (team+app first, then team-only).
// Returns BudgetResult with the status and details.
func (bt *BudgetTracker) CheckBudget(team, app string) BudgetResult {
	bt.mu.RLock()
	defer bt.mu.RUnlock()

	// Find matching budget entries. Prefer team+app specific over team-only.
	var match *BudgetEntry

	for i := range bt.budgets {
		b := &bt.budgets[i]
		if b.Team == team && b.App == app && app != "" {
			match = b
			break // exact team+app match is highest priority
		}
		if b.Team == team && b.App == "" && match == nil {
			match = b
		}
	}

	if match == nil {
		return BudgetResult{Status: BudgetOK}
	}

	key := budgetKey(match.Team, match.App)
	currentSpend := bt.spend[key]
	pct := 0.0
	if match.MonthlyLimit > 0 {
		pct = currentSpend / match.MonthlyLimit
	}

	result := BudgetResult{
		Action:       match.Action,
		Team:         match.Team,
		App:          match.App,
		MonthlyLimit: match.MonthlyLimit,
		CurrentSpend: currentSpend,
		Percent:      pct,
	}

	switch {
	case pct >= 1.0:
		result.Status = BudgetExceeded
	case pct >= bt.warningPct:
		result.Status = BudgetWarning
	default:
		result.Status = BudgetOK
	}

	return result
}

// GetBudgetPercent returns the current budget utilization as a fraction (0.0 to 1.0+).
// Returns 0.0 if no budget is set for the team/app.
func (bt *BudgetTracker) GetBudgetPercent(team, app string) float64 {
	result := bt.CheckBudget(team, app)
	return result.Percent
}

// FormatWarningHeader returns the header value for a budget warning.
func (r BudgetResult) FormatWarningHeader() string {
	pctStr := fmt.Sprintf("%.0f", r.Percent*100)
	return fmt.Sprintf("Team '%s' at %s%% of monthly budget ($%.2f/$%.2f)",
		r.Team, pctStr, r.CurrentSpend, r.MonthlyLimit)
}

// FormatExceededMessage returns the JSON error message body for a blocked request.
func (r BudgetResult) FormatExceededMessage() string {
	label := r.Team
	if r.App != "" {
		label = fmt.Sprintf("%s/%s", r.Team, r.App)
	}
	return fmt.Sprintf(
		`{"error":{"type":"budget_exceeded","message":"Team '%s' has exceeded monthly budget of $%.2f (current: $%.2f)"}}`,
		label, r.MonthlyLimit, r.CurrentSpend,
	)
}
