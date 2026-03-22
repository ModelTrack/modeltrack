package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"
)

// CacheEntry stores a cached LLM response.
type CacheEntry struct {
	ResponseBody []byte
	ContentType  string
	Timestamp    time.Time
	HitCount     int64
	CostUSD      float64 // the cost of the original request, used to estimate savings
}

// CacheStats holds aggregate cache statistics.
type CacheStats struct {
	TotalHits       int64   `json:"total_hits"`
	TotalMisses     int64   `json:"total_misses"`
	HitRatePercent  float64 `json:"hit_rate_percent"`
	EntriesCount    int     `json:"entries_count"`
	MaxEntries      int     `json:"max_entries"`
	TTLSeconds      int     `json:"ttl_seconds"`
	EstSavingsUSD   float64 `json:"estimated_savings_usd"`
}

// lruNode is a node in a doubly-linked list for LRU eviction.
type lruNode struct {
	key  string
	prev *lruNode
	next *lruNode
}

// ResponseCache is a thread-safe in-memory LRU cache with TTL for LLM responses.
type ResponseCache struct {
	mu         sync.RWMutex
	entries    map[string]CacheEntry
	order      map[string]*lruNode // key -> node for O(1) access
	head       *lruNode            // most recently used
	tail       *lruNode            // least recently used
	maxEntries int
	ttl        time.Duration
	hits       int64
	misses     int64
	savings    float64 // accumulated estimated savings in USD
	enabled    bool
	stopCh     chan struct{}
}

// NewResponseCache creates a new cache with the given configuration.
func NewResponseCache(maxEntries int, ttlSeconds int, enabled bool) *ResponseCache {
	c := &ResponseCache{
		entries:    make(map[string]CacheEntry),
		order:      make(map[string]*lruNode),
		maxEntries: maxEntries,
		ttl:        time.Duration(ttlSeconds) * time.Second,
		enabled:    enabled,
		stopCh:     make(chan struct{}),
	}
	if enabled {
		go c.cleanupLoop()
	}
	return c
}

// Get retrieves a cache entry by key. Returns the entry and true if found and not expired.
func (c *ResponseCache) Get(key string) (CacheEntry, bool) {
	if !c.enabled {
		return CacheEntry{}, false
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	entry, ok := c.entries[key]
	if !ok {
		c.misses++
		return CacheEntry{}, false
	}

	// Check TTL.
	if time.Since(entry.Timestamp) > c.ttl {
		c.removeEntry(key)
		c.misses++
		return CacheEntry{}, false
	}

	// Update hit count and move to front.
	entry.HitCount++
	c.entries[key] = entry
	c.moveToFront(key)

	c.hits++
	c.savings += entry.CostUSD

	return entry, true
}

// Set stores a cache entry. Evicts the LRU entry if at capacity.
func (c *ResponseCache) Set(key string, entry CacheEntry) {
	if !c.enabled {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// If key already exists, update it.
	if _, ok := c.entries[key]; ok {
		c.entries[key] = entry
		c.moveToFront(key)
		return
	}

	// Evict LRU if at capacity.
	for len(c.entries) >= c.maxEntries && c.tail != nil {
		c.removeEntry(c.tail.key)
	}

	// Insert new entry.
	c.entries[key] = entry
	c.addToFront(key)
}

// Stats returns current cache statistics.
func (c *ResponseCache) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	total := c.hits + c.misses
	var hitRate float64
	if total > 0 {
		hitRate = float64(c.hits) / float64(total) * 100
	}

	return CacheStats{
		TotalHits:      c.hits,
		TotalMisses:    c.misses,
		HitRatePercent: hitRate,
		EntriesCount:   len(c.entries),
		MaxEntries:     c.maxEntries,
		TTLSeconds:     int(c.ttl.Seconds()),
		EstSavingsUSD:  c.savings,
	}
}

// GenerateKey creates a cache key from provider, model, and messages.
// The key is a SHA-256 hash of the normalized inputs.
func GenerateKey(provider, model string, messages json.RawMessage) string {
	// Normalize messages JSON: unmarshal and re-marshal with sorted keys.
	normalized := normalizeJSON(messages)

	h := sha256.New()
	h.Write([]byte(provider))
	h.Write([]byte("|"))
	h.Write([]byte(model))
	h.Write([]byte("|"))
	h.Write([]byte(normalized))

	return fmt.Sprintf("%x", h.Sum(nil))
}

// Close stops the background cleanup goroutine.
func (c *ResponseCache) Close() {
	if c.enabled {
		close(c.stopCh)
	}
}

// --- LRU linked list operations (must be called with lock held) ---

func (c *ResponseCache) addToFront(key string) {
	node := &lruNode{key: key}
	c.order[key] = node

	if c.head == nil {
		c.head = node
		c.tail = node
		return
	}

	node.next = c.head
	c.head.prev = node
	c.head = node
}

func (c *ResponseCache) moveToFront(key string) {
	node, ok := c.order[key]
	if !ok {
		return
	}
	if node == c.head {
		return
	}
	// Detach node.
	if node.prev != nil {
		node.prev.next = node.next
	}
	if node.next != nil {
		node.next.prev = node.prev
	}
	if node == c.tail {
		c.tail = node.prev
	}
	// Move to front.
	node.prev = nil
	node.next = c.head
	c.head.prev = node
	c.head = node
}

func (c *ResponseCache) removeEntry(key string) {
	node, ok := c.order[key]
	if !ok {
		return
	}
	// Detach node.
	if node.prev != nil {
		node.prev.next = node.next
	} else {
		c.head = node.next
	}
	if node.next != nil {
		node.next.prev = node.prev
	} else {
		c.tail = node.prev
	}
	delete(c.order, key)
	delete(c.entries, key)
}

// cleanupLoop runs every 5 minutes and removes expired entries.
func (c *ResponseCache) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.evictExpired()
		case <-c.stopCh:
			return
		}
	}
}

func (c *ResponseCache) evictExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()

	var expiredKeys []string
	for key, entry := range c.entries {
		if time.Since(entry.Timestamp) > c.ttl {
			expiredKeys = append(expiredKeys, key)
		}
	}

	for _, key := range expiredKeys {
		c.removeEntry(key)
	}

	if len(expiredKeys) > 0 {
		log.Printf("Cache cleanup: evicted %d expired entries, %d remaining", len(expiredKeys), len(c.entries))
	}
}

// normalizeJSON takes raw JSON and returns a normalized string with sorted keys and trimmed whitespace.
func normalizeJSON(raw json.RawMessage) string {
	trimmed := strings.TrimSpace(string(raw))
	if len(trimmed) == 0 {
		return ""
	}

	var data interface{}
	if err := json.Unmarshal([]byte(trimmed), &data); err != nil {
		// If we can't parse it, just use the trimmed version.
		return trimmed
	}

	normalized := sortAndMarshal(data)
	return normalized
}

// sortAndMarshal recursively sorts map keys and marshals to a canonical JSON string.
func sortAndMarshal(v interface{}) string {
	switch val := v.(type) {
	case map[string]interface{}:
		keys := make([]string, 0, len(val))
		for k := range val {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		parts := make([]string, 0, len(keys))
		for _, k := range keys {
			kJSON, _ := json.Marshal(k)
			parts = append(parts, string(kJSON)+":"+sortAndMarshal(val[k]))
		}
		return "{" + strings.Join(parts, ",") + "}"

	case []interface{}:
		parts := make([]string, 0, len(val))
		for _, item := range val {
			parts = append(parts, sortAndMarshal(item))
		}
		return "[" + strings.Join(parts, ",") + "]"

	default:
		b, _ := json.Marshal(v)
		return string(b)
	}
}
