package main

import (
	"encoding/json"
	"log"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

// CostEvent represents a single LLM API call with its cost information.
type CostEvent struct {
	EventID          string  `json:"event_id"`
	Timestamp        string  `json:"timestamp"`
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	InputTokens      int     `json:"input_tokens"`
	OutputTokens     int     `json:"output_tokens"`
	CacheReadTokens  int     `json:"cache_read_tokens"`
	CacheWriteTokens int     `json:"cache_write_tokens"`
	CostUSD          float64 `json:"cost_usd"`
	LatencyMs        int64   `json:"latency_ms"`
	StatusCode       int     `json:"status_code"`
	IsStreaming       bool    `json:"is_streaming"`
	AppID            string  `json:"app_id,omitempty"`
	Team             string  `json:"team,omitempty"`
	Feature          string  `json:"feature,omitempty"`
	CustomerTier     string  `json:"customer_tier,omitempty"`
	SessionID        string  `json:"session_id,omitempty"`
	TraceID          string  `json:"trace_id,omitempty"`
	CacheHit         bool    `json:"cache_hit,omitempty"`
	TokenSummary     string  `json:"token_summary"`
}

// Stats holds aggregate statistics, updated atomically.
type Stats struct {
	TotalRequests int64
	TotalTokens   int64
	TotalCostUSD  uint64 // stored as cost * 1e9 for atomic ops
}

// EventLogger asynchronously buffers and flushes cost events to a JSONL file.
type EventLogger struct {
	events    chan CostEvent
	filePath  string
	stats     Stats
	done      chan struct{}
	closeOnce sync.Once
}

const (
	bufferSize    = 10_000
	flushInterval = 1 * time.Second
	flushBatch    = 50
)

// NewEventLogger creates and starts the async event logger.
func NewEventLogger(filePath string) *EventLogger {
	el := &EventLogger{
		events:   make(chan CostEvent, bufferSize),
		filePath: filePath,
		done:     make(chan struct{}),
	}
	go el.run()
	return el
}

// Log enqueues a cost event. Never blocks the caller — drops if buffer is full.
func (el *EventLogger) Log(event CostEvent) {
	// Update stats atomically.
	atomic.AddInt64(&el.stats.TotalRequests, 1)
	atomic.AddInt64(&el.stats.TotalTokens, int64(event.InputTokens+event.OutputTokens))
	// Store cost as fixed-point (multiply by 1e9) for atomic add.
	costFixed := uint64(event.CostUSD * 1e9)
	atomic.AddUint64(&el.stats.TotalCostUSD, costFixed)

	select {
	case el.events <- event:
	default:
		log.Printf("WARN: event buffer full, dropping event %s", event.EventID)
	}
}

// GetStats returns current aggregate statistics.
func (el *EventLogger) GetStats() (totalRequests, totalTokens int64, totalCostUSD float64) {
	totalRequests = atomic.LoadInt64(&el.stats.TotalRequests)
	totalTokens = atomic.LoadInt64(&el.stats.TotalTokens)
	costFixed := atomic.LoadUint64(&el.stats.TotalCostUSD)
	totalCostUSD = float64(costFixed) / 1e9
	return
}

// Close drains remaining events and shuts down the logger.
func (el *EventLogger) Close() {
	el.closeOnce.Do(func() {
		close(el.events)
		<-el.done
	})
}

func (el *EventLogger) run() {
	defer close(el.done)

	ticker := time.NewTicker(flushInterval)
	defer ticker.Stop()

	var batch []CostEvent

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := el.writeBatch(batch); err != nil {
			log.Printf("ERROR: failed to write cost events: %v", err)
		}
		batch = batch[:0]
	}

	for {
		select {
		case event, ok := <-el.events:
			if !ok {
				// Channel closed — flush remaining.
				flush()
				return
			}
			batch = append(batch, event)
			if len(batch) >= flushBatch {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (el *EventLogger) writeBatch(batch []CostEvent) error {
	f, err := os.OpenFile(el.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	for i := range batch {
		if err := enc.Encode(&batch[i]); err != nil {
			return err
		}
	}
	return nil
}
