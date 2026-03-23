package adapters

import "net/http"

// ProviderAdapter is the interface all LLM provider adapters implement.
type ProviderAdapter interface {
	Proxy(w http.ResponseWriter, r *http.Request) (*ProxyResult, error)
}
