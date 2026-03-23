package adapters

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// BedrockAdapter proxies requests to AWS Bedrock via a configurable endpoint URL.
// It accepts requests in Anthropic Messages format and forwards them to Bedrock,
// extracting usage from the response (same format as Anthropic for Bedrock's Anthropic models).
// Non-streaming only for MVP.
type BedrockAdapter struct {
	EndpointURL string // e.g. https://my-bedrock-proxy.example.com
	Region      string
	Client      *http.Client
}

// NewBedrockAdapter creates a new adapter with the given endpoint URL and region.
func NewBedrockAdapter(endpointURL, region string) *BedrockAdapter {
	return &BedrockAdapter{
		EndpointURL: endpointURL,
		Region:      region,
		Client: &http.Client{
			Timeout: 5 * time.Minute, // LLM responses can be slow
		},
	}
}

// bedrockRequestBody is used to extract the model from Anthropic-format requests.
type bedrockRequestBody struct {
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

// bedrockResponse is the non-streaming response structure (Anthropic format from Bedrock).
type bedrockResponse struct {
	Model string `json:"model"`
	Usage struct {
		InputTokens      int `json:"input_tokens"`
		OutputTokens     int `json:"output_tokens"`
		CacheReadTokens  int `json:"cache_read_input_tokens"`
		CacheWriteTokens int `json:"cache_creation_input_tokens"`
	} `json:"usage"`
}

// Proxy forwards the request to the Bedrock endpoint and writes the response back to the client.
// It extracts token usage from non-streaming responses (streaming not supported in MVP).
func (b *BedrockAdapter) Proxy(w http.ResponseWriter, r *http.Request) (*ProxyResult, error) {
	start := time.Now()

	// Read and parse the request body to determine model.
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("reading request body: %w", err)
	}
	defer r.Body.Close()

	var reqBody bedrockRequestBody
	if err := json.Unmarshal(bodyBytes, &reqBody); err != nil {
		return nil, fmt.Errorf("parsing request body: %w", err)
	}

	// Streaming is not supported in the Bedrock MVP adapter.
	if reqBody.Stream {
		http.Error(w, `{"error":"streaming not supported for Bedrock in this version"}`, http.StatusBadRequest)
		return &ProxyResult{
			StatusCode: http.StatusBadRequest,
			Usage:      TokenUsage{Model: reqBody.Model},
			LatencyMs:  time.Since(start).Milliseconds(),
		}, nil
	}

	// Build upstream request to the configurable Bedrock endpoint.
	// The endpoint is expected to handle the Anthropic Messages format
	// (e.g., via API Gateway or a Bedrock-compatible proxy).
	upstreamURL := b.EndpointURL + "/v1/messages"
	upReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstreamURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("creating upstream request: %w", err)
	}

	// Forward relevant headers.
	forwardHeaders := []string{
		"Content-Type",
		"Anthropic-Version",
		"Anthropic-Beta",
		"X-Api-Key",
		"Authorization",
		// AWS-specific headers the user may provide when using a direct Bedrock proxy.
		"X-Amz-Date",
		"X-Amz-Security-Token",
	}
	for _, h := range forwardHeaders {
		if v := r.Header.Get(h); v != "" {
			upReq.Header.Set(h, v)
		}
	}

	// Execute the upstream request.
	resp, err := b.Client.Do(upReq)
	if err != nil {
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	result := &ProxyResult{
		StatusCode: resp.StatusCode,
		IsStream:   false,
		Usage:      TokenUsage{Model: reqBody.Model},
	}

	// Handle non-streaming response.
	err = b.proxyNonStreaming(w, resp, result)

	result.LatencyMs = time.Since(start).Milliseconds()
	return result, err
}

// proxyNonStreaming handles standard JSON responses from Bedrock.
func (b *BedrockAdapter) proxyNonStreaming(w http.ResponseWriter, resp *http.Response, result *ProxyResult) error {
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading upstream response: %w", err)
	}

	// Extract token usage from the response (Anthropic format).
	if resp.StatusCode == http.StatusOK {
		var apiResp bedrockResponse
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
