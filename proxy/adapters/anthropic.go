package adapters

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// TokenUsage holds extracted token counts from an Anthropic response.
type TokenUsage struct {
	InputTokens      int
	OutputTokens     int
	CacheReadTokens  int
	CacheWriteTokens int
	Model            string
}

// AnthropicAdapter proxies requests to the Anthropic Messages API.
type AnthropicAdapter struct {
	BaseURL string
	Client  *http.Client
}

// NewAnthropicAdapter creates a new adapter with the given base URL.
func NewAnthropicAdapter(baseURL string) *AnthropicAdapter {
	return &AnthropicAdapter{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 5 * time.Minute, // LLM responses can be slow
		},
	}
}

// anthropicMessageBody is used to extract the model and streaming flag from requests.
type anthropicMessageBody struct {
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

// anthropicResponse is the non-streaming response structure (partial).
type anthropicResponse struct {
	Model string `json:"model"`
	Usage struct {
		InputTokens      int `json:"input_tokens"`
		OutputTokens     int `json:"output_tokens"`
		CacheReadTokens  int `json:"cache_read_input_tokens"`
		CacheWriteTokens int `json:"cache_creation_input_tokens"`
	} `json:"usage"`
}

// sseMessageStart is the message_start SSE event data.
type sseMessageStart struct {
	Type    string `json:"type"`
	Message struct {
		Model string `json:"model"`
		Usage struct {
			InputTokens      int `json:"input_tokens"`
			OutputTokens     int `json:"output_tokens"`
			CacheReadTokens  int `json:"cache_read_input_tokens"`
			CacheWriteTokens int `json:"cache_creation_input_tokens"`
		} `json:"usage"`
	} `json:"message"`
}

// sseMessageDelta is the message_delta SSE event data.
type sseMessageDelta struct {
	Type  string `json:"type"`
	Usage struct {
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// ProxyResult contains the result of a proxied request.
type ProxyResult struct {
	Usage      TokenUsage
	StatusCode int
	IsStream   bool
	LatencyMs  int64
}

// Proxy forwards the request to Anthropic and writes the response back to the client.
// It extracts token usage from both streaming and non-streaming responses.
func (a *AnthropicAdapter) Proxy(w http.ResponseWriter, r *http.Request) (*ProxyResult, error) {
	start := time.Now()

	// Read and parse the request body to determine model and streaming mode.
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("reading request body: %w", err)
	}
	defer r.Body.Close()

	var reqBody anthropicMessageBody
	if err := json.Unmarshal(bodyBytes, &reqBody); err != nil {
		return nil, fmt.Errorf("parsing request body: %w", err)
	}

	// Build upstream request.
	upstreamURL := a.BaseURL + "/v1/messages"
	upReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstreamURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("creating upstream request: %w", err)
	}

	// Forward relevant headers.
	forwardHeaders := []string{
		"Authorization",
		"Content-Type",
		"Anthropic-Version",
		"Anthropic-Beta",
		"X-Api-Key",
	}
	for _, h := range forwardHeaders {
		if v := r.Header.Get(h); v != "" {
			upReq.Header.Set(h, v)
		}
	}

	// Execute the upstream request.
	resp, err := a.Client.Do(upReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	result := &ProxyResult{
		StatusCode: resp.StatusCode,
		IsStream:   reqBody.Stream,
		Usage:      TokenUsage{Model: reqBody.Model},
	}

	if reqBody.Stream {
		err = a.proxyStreaming(w, resp, result)
	} else {
		err = a.proxyNonStreaming(w, resp, result)
	}

	result.LatencyMs = time.Since(start).Milliseconds()
	return result, err
}

// proxyNonStreaming handles standard JSON responses.
func (a *AnthropicAdapter) proxyNonStreaming(w http.ResponseWriter, resp *http.Response, result *ProxyResult) error {
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading upstream response: %w", err)
	}

	// Extract token usage from the response.
	if resp.StatusCode == http.StatusOK {
		var apiResp anthropicResponse
		if err := json.Unmarshal(respBody, &apiResp); err == nil {
			result.Usage.InputTokens = apiResp.Usage.InputTokens
			result.Usage.OutputTokens = apiResp.Usage.OutputTokens
			result.Usage.CacheReadTokens = apiResp.Usage.CacheReadTokens
			result.Usage.CacheWriteTokens = apiResp.Usage.CacheWriteTokens
			if apiResp.Model != "" {
				result.Usage.Model = apiResp.Model
			}
		}
	}

	// Copy response headers and body to the client.
	copyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, err = w.Write(respBody)
	return err
}

// proxyStreaming handles SSE streaming responses, parsing token usage from events.
func (a *AnthropicAdapter) proxyStreaming(w http.ResponseWriter, resp *http.Response, result *ProxyResult) error {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported by response writer")
	}

	// Copy response headers.
	copyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		// Non-OK streaming response — just copy through.
		_, err := io.Copy(w, resp.Body)
		flusher.Flush()
		return err
	}

	scanner := bufio.NewScanner(resp.Body)
	// Increase buffer for large SSE events.
	scanner.Buffer(make([]byte, 0, 256*1024), 1024*1024)

	var currentEventType string

	for scanner.Scan() {
		line := scanner.Text()

		// Parse SSE event type.
		if strings.HasPrefix(line, "event: ") {
			currentEventType = strings.TrimPrefix(line, "event: ")
		}

		// Parse SSE data and extract token counts.
		if strings.HasPrefix(line, "data: ") && currentEventType != "" {
			data := strings.TrimPrefix(line, "data: ")
			a.extractStreamingUsage(currentEventType, data, result)
		}

		// Empty line resets event type (SSE spec).
		if line == "" {
			currentEventType = ""
		}

		// Write the line to the client immediately.
		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	return scanner.Err()
}

// extractStreamingUsage parses SSE event data to extract token usage.
func (a *AnthropicAdapter) extractStreamingUsage(eventType, data string, result *ProxyResult) {
	switch eventType {
	case "message_start":
		var msg sseMessageStart
		if err := json.Unmarshal([]byte(data), &msg); err == nil {
			result.Usage.InputTokens = msg.Message.Usage.InputTokens
			result.Usage.OutputTokens = msg.Message.Usage.OutputTokens
			result.Usage.CacheReadTokens = msg.Message.Usage.CacheReadTokens
			result.Usage.CacheWriteTokens = msg.Message.Usage.CacheWriteTokens
			if msg.Message.Model != "" {
				result.Usage.Model = msg.Message.Model
			}
		}
	case "message_delta":
		var delta sseMessageDelta
		if err := json.Unmarshal([]byte(data), &delta); err == nil {
			result.Usage.OutputTokens = delta.Usage.OutputTokens
		}
	}
}

// copyHeaders copies response headers from upstream to the client, excluding hop-by-hop headers.
func copyHeaders(dst, src http.Header) {
	hopByHop := map[string]bool{
		"Connection":          true,
		"Keep-Alive":          true,
		"Transfer-Encoding":   true,
		"Proxy-Authenticate":  true,
		"Proxy-Authorization": true,
		"Te":                  true,
		"Trailer":             true,
		"Upgrade":             true,
	}
	for k, vv := range src {
		if hopByHop[k] {
			continue
		}
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}
