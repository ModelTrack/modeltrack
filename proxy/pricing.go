package main

// ModelPricing holds per-token costs for a model in USD.
type ModelPricing struct {
	InputPerToken       float64
	OutputPerToken      float64
	CacheReadPerToken   float64
	CacheWritePerToken  float64
}

// anthropicPricing maps model identifiers to their pricing.
// Prices are in USD per token (converted from per-million-token rates).
var anthropicPricing = map[string]ModelPricing{
	// Claude Opus 4 — $15 / $75 per 1M tokens
	"claude-opus-4-6": {
		InputPerToken:      15.0 / 1_000_000,
		OutputPerToken:     75.0 / 1_000_000,
		CacheReadPerToken:  1.5 / 1_000_000,
		CacheWritePerToken: 18.75 / 1_000_000,
	},
	// Claude Sonnet 4 — $3 / $15 per 1M tokens
	"claude-sonnet-4-6": {
		InputPerToken:      3.0 / 1_000_000,
		OutputPerToken:     15.0 / 1_000_000,
		CacheReadPerToken:  0.3 / 1_000_000,
		CacheWritePerToken: 3.75 / 1_000_000,
	},
	// Claude Haiku 3.5 — $0.80 / $4 per 1M tokens
	"claude-haiku-4-5": {
		InputPerToken:      0.80 / 1_000_000,
		OutputPerToken:     4.0 / 1_000_000,
		CacheReadPerToken:  0.08 / 1_000_000,
		CacheWritePerToken: 1.0 / 1_000_000,
	},
}

// openaiPricing maps model identifiers to their pricing.
// Prices are in USD per token (converted from per-million-token rates).
var openaiPricing = map[string]ModelPricing{
	// GPT-4o — $2.50 / $10.00 per 1M tokens
	"gpt-4o": {
		InputPerToken:  2.50 / 1_000_000,
		OutputPerToken: 10.00 / 1_000_000,
	},
	// GPT-4o mini — $0.15 / $0.60 per 1M tokens
	"gpt-4o-mini": {
		InputPerToken:  0.15 / 1_000_000,
		OutputPerToken: 0.60 / 1_000_000,
	},
	// GPT-4.1 — $2.00 / $8.00 per 1M tokens
	"gpt-4.1": {
		InputPerToken:  2.00 / 1_000_000,
		OutputPerToken: 8.00 / 1_000_000,
	},
	// GPT-4.1 mini — $0.40 / $1.60 per 1M tokens
	"gpt-4.1-mini": {
		InputPerToken:  0.40 / 1_000_000,
		OutputPerToken: 1.60 / 1_000_000,
	},
	// GPT-4.1 nano — $0.10 / $0.40 per 1M tokens
	"gpt-4.1-nano": {
		InputPerToken:  0.10 / 1_000_000,
		OutputPerToken: 0.40 / 1_000_000,
	},
	// o3 — $2.00 / $8.00 per 1M tokens
	"o3": {
		InputPerToken:  2.00 / 1_000_000,
		OutputPerToken: 8.00 / 1_000_000,
	},
	// o4-mini — $1.10 / $4.40 per 1M tokens
	"o4-mini": {
		InputPerToken:  1.10 / 1_000_000,
		OutputPerToken: 4.40 / 1_000_000,
	},
}

// CalculateCost computes the total cost in USD for a given model and token counts.
// Returns 0 if the model is unknown.
func CalculateCost(provider, model string, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens int) float64 {
	var pricingTable map[string]ModelPricing

	switch provider {
	case "anthropic":
		pricingTable = anthropicPricing
	case "openai":
		pricingTable = openaiPricing
	default:
		return 0
	}

	pricing, ok := pricingTable[model]
	if !ok {
		// Try common aliases / versioned names by checking prefixes.
		for key, p := range pricingTable {
			if len(model) > len(key) && model[:len(key)] == key {
				pricing = p
				ok = true
				break
			}
		}
		if !ok {
			return 0
		}
	}

	cost := float64(inputTokens)*pricing.InputPerToken +
		float64(outputTokens)*pricing.OutputPerToken +
		float64(cacheReadTokens)*pricing.CacheReadPerToken +
		float64(cacheWriteTokens)*pricing.CacheWritePerToken

	return cost
}
