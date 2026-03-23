package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// OpenCostCollector collects GPU cost data from the OpenCost API.
type OpenCostCollector struct {
	cfg    *Config
	writer *EventWriter
	client *http.Client
	nsMap  map[string]string // namespace -> team mapping
}

// openCostResponse represents the OpenCost API response structure.
type openCostResponse struct {
	Code int                                      `json:"code"`
	Data []map[string]openCostAllocationEntry      `json:"data"`
}

// openCostAllocationEntry represents a single allocation entry from OpenCost.
type openCostAllocationEntry struct {
	Name       string             `json:"name"`
	Properties openCostProperties `json:"properties"`
	CPUCost    float64            `json:"cpuCost"`
	GPUCost    float64            `json:"gpuCost"`
	RAMCost    float64            `json:"ramCost"`
	TotalCost  float64            `json:"totalCost"`
	GPUHours   float64            `json:"gpuHours"`
}

// openCostProperties contains metadata for an allocation.
type openCostProperties struct {
	Cluster    string            `json:"cluster"`
	Namespace  string            `json:"namespace"`
	Controller string            `json:"controller"`
	Pod        string            `json:"pod"`
	Labels     map[string]string `json:"labels"`
}

// NewOpenCostCollector creates a new OpenCost collector.
func NewOpenCostCollector(cfg *Config, writer *EventWriter) *OpenCostCollector {
	c := &OpenCostCollector{
		cfg:    cfg,
		writer: writer,
		client: &http.Client{Timeout: 30 * time.Second},
		nsMap:  make(map[string]string),
	}
	c.loadNamespaceMap()
	return c
}

// loadNamespaceMap reads the namespace-to-team mapping from the data directory.
func (c *OpenCostCollector) loadNamespaceMap() {
	data, err := os.ReadFile(c.cfg.NamespaceMapFile)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("WARN: could not read namespace map: %v", err)
		}
		return
	}

	if err := json.Unmarshal(data, &c.nsMap); err != nil {
		log.Printf("WARN: could not parse namespace map: %v", err)
	}
}

// resolveTeam maps a Kubernetes namespace to a team name.
func (c *OpenCostCollector) resolveTeam(namespace string) string {
	if team, ok := c.nsMap[namespace]; ok {
		return team
	}
	if team, ok := c.nsMap["default"]; ok {
		return team
	}
	return "unassigned"
}

// Collect queries the OpenCost API and writes GPU cost events.
func (c *OpenCostCollector) Collect(ctx context.Context) error {
	// Reload namespace map on each collection in case it was updated.
	c.loadNamespaceMap()

	url := fmt.Sprintf("%s/allocation/compute?window=1h&aggregate=namespace,controller", c.cfg.OpenCostEndpoint)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("creating OpenCost request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("querying OpenCost API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("OpenCost API returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading OpenCost response: %w", err)
	}

	var ocResp openCostResponse
	if err := json.Unmarshal(body, &ocResp); err != nil {
		return fmt.Errorf("parsing OpenCost response: %w", err)
	}

	now := time.Now().UTC()
	var events []CostEvent

	for _, window := range ocResp.Data {
		for _, entry := range window {
			// Only create events for entries with GPU cost.
			if entry.GPUCost <= 0 {
				continue
			}

			namespace := entry.Properties.Namespace
			controller := entry.Properties.Controller
			pod := entry.Properties.Pod

			// Extract GPU type from labels if available.
			gpuType := ""
			instanceType := ""
			if entry.Properties.Labels != nil {
				if v, ok := entry.Properties.Labels["nvidia.com/gpu.product"]; ok {
					gpuType = v
				}
				if v, ok := entry.Properties.Labels["node.kubernetes.io/instance-type"]; ok {
					instanceType = v
				}
			}

			event := CostEvent{
				EventID:      fmt.Sprintf("opencost-%s-%s-%s-%d", namespace, controller, pod, now.UnixNano()),
				Timestamp:    now.Format(time.RFC3339),
				EventType:    "gpu_compute",
				Provider:     "kubernetes",
				Service:      "gpu",
				Model:        "",
				CostUSD:      entry.GPUCost,
				Team:         c.resolveTeam(namespace),
				Namespace:    namespace,
				PodName:      pod,
				JobName:      controller,
				InstanceType: instanceType,
				GPUType:      gpuType,
			}

			events = append(events, event)
		}
	}

	if len(events) > 0 {
		if err := c.writer.WriteEvents(events); err != nil {
			return fmt.Errorf("writing OpenCost events: %w", err)
		}
		log.Printf("INFO: wrote %d OpenCost GPU cost events", len(events))
	} else {
		log.Printf("INFO: no GPU cost data from OpenCost")
	}

	return nil
}
