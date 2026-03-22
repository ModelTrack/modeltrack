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

// OpenAIAdapter proxies requests to the OpenAI Chat Completions API.
type OpenAIAdapter struct {
	BaseURL string
	Client  *http.Client
}

// NewOpenAIAdapter creates a new adapter with the given base URL.
func NewOpenAIAdapter(baseURL string) *OpenAIAdapter {
	return &OpenAIAdapter{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 5 * time.Minute, // LLM responses can be slow
		},
	}
}

// openaiRequestBody is used to extract the model and streaming flag from requests.
type openaiRequestBody struct {
	Model         string                 `json:"model"`
	Stream        bool                   `json:"stream"`
	StreamOptions map[string]interface{} `json:"stream_options,omitempty"`
}

// openaiResponse is the non-streaming response structure (partial).
type openaiResponse struct {
	Model string `json:"model"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// openaiStreamChunk is a streaming chunk that may contain usage info.
type openaiStreamChunk struct {
	Model string `json:"model"`
	Usage *struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage,omitempty"`
}

// Proxy forwards the request to OpenAI and writes the response back to the client.
// It extracts token usage from both streaming and non-streaming responses.
func (o *OpenAIAdapter) Proxy(w http.ResponseWriter, r *http.Request) (*ProxyResult, error) {
	start := time.Now()

	// Read and parse the request body to determine model and streaming mode.
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("reading request body: %w", err)
	}
	defer r.Body.Close()

	var reqBody openaiRequestBody
	if err := json.Unmarshal(bodyBytes, &reqBody); err != nil {
		return nil, fmt.Errorf("parsing request body: %w", err)
	}

	// For streaming requests, inject stream_options.include_usage if not present,
	// so we always get usage data in the final chunk.
	if reqBody.Stream {
		bodyBytes, err = o.ensureStreamUsage(bodyBytes)
		if err != nil {
			return nil, fmt.Errorf("injecting stream_options: %w", err)
		}
	}

	// Build upstream request.
	upstreamURL := o.BaseURL + "/v1/chat/completions"
	upReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstreamURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("creating upstream request: %w", err)
	}

	// Forward relevant headers.
	forwardHeaders := []string{
		"Authorization",
		"Content-Type",
		"OpenAI-Organization",
		"OpenAI-Project",
	}
	for _, h := range forwardHeaders {
		if v := r.Header.Get(h); v != "" {
			upReq.Header.Set(h, v)
		}
	}

	// Execute the upstream request.
	resp, err := o.Client.Do(upReq)
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
		err = o.proxyStreaming(w, resp, result)
	} else {
		err = o.proxyNonStreaming(w, resp, result)
	}

	result.LatencyMs = time.Since(start).Milliseconds()
	return result, err
}

// ensureStreamUsage injects stream_options.include_usage=true into the request body
// if it is not already present, so we always receive usage data in streaming responses.
func (o *OpenAIAdapter) ensureStreamUsage(bodyBytes []byte) ([]byte, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return bodyBytes, err
	}

	if _, exists := raw["stream_options"]; !exists {
		raw["stream_options"] = json.RawMessage(`{"include_usage":true}`)
		return json.Marshal(raw)
	}

	// stream_options exists — check if include_usage is already set.
	var opts map[string]interface{}
	if err := json.Unmarshal(raw["stream_options"], &opts); err == nil {
		if _, ok := opts["include_usage"]; !ok {
			opts["include_usage"] = true
			updated, err := json.Marshal(opts)
			if err != nil {
				return bodyBytes, err
			}
			raw["stream_options"] = json.RawMessage(updated)
			return json.Marshal(raw)
		}
	}

	return bodyBytes, nil
}

// proxyNonStreaming handles standard JSON responses.
func (o *OpenAIAdapter) proxyNonStreaming(w http.ResponseWriter, resp *http.Response, result *ProxyResult) error {
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading upstream response: %w", err)
	}

	// Extract token usage from the response.
	if resp.StatusCode == http.StatusOK {
		var apiResp openaiResponse
		if err := json.Unmarshal(respBody, &apiResp); err == nil {
			result.Usage.InputTokens = apiResp.Usage.PromptTokens
			result.Usage.OutputTokens = apiResp.Usage.CompletionTokens
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
func (o *OpenAIAdapter) proxyStreaming(w http.ResponseWriter, resp *http.Response, result *ProxyResult) error {
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

	for scanner.Scan() {
		line := scanner.Text()

		// Parse SSE data lines to extract usage from the final chunk.
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if data != "[DONE]" {
				var chunk openaiStreamChunk
				if err := json.Unmarshal([]byte(data), &chunk); err == nil {
					if chunk.Model != "" {
						result.Usage.Model = chunk.Model
					}
					if chunk.Usage != nil {
						result.Usage.InputTokens = chunk.Usage.PromptTokens
						result.Usage.OutputTokens = chunk.Usage.CompletionTokens
					}
				}
			}
		}

		// Write the line to the client immediately.
		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	return scanner.Err()
}
