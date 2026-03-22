#!/bin/bash
# Test script: sends sample requests through the CostTrack proxy
# Usage: ANTHROPIC_API_KEY=sk-... ./scripts/test-proxy.sh

set -e

PROXY_URL="${PROXY_URL:-http://localhost:8080}"
API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY environment variable}"

echo "=== CostTrack Proxy Test ==="
echo "Proxy: $PROXY_URL"
echo ""

# Test 1: Health check
echo "1. Health check..."
curl -s "$PROXY_URL/healthz" | jq .
echo ""

# Test 2: Non-streaming request (chatbot app, product team)
echo "2. Non-streaming request (app=chatbot, team=product)..."
curl -s "$PROXY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-CostTrack-App: chatbot" \
  -H "X-CostTrack-Team: product" \
  -H "X-CostTrack-Feature: customer-support" \
  -d '{
    "model": "claude-haiku-4-5-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "What is 2+2? Reply in one word."}]
  }' | jq '{model: .model, input_tokens: .usage.input_tokens, output_tokens: .usage.output_tokens}'
echo ""

# Test 3: Streaming request (summarizer app, data team)
echo "3. Streaming request (app=summarizer, team=data-eng)..."
curl -s "$PROXY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-CostTrack-App: summarizer" \
  -H "X-CostTrack-Team: data-eng" \
  -H "X-CostTrack-Feature: doc-summary" \
  -d '{
    "model": "claude-haiku-4-5-20241022",
    "max_tokens": 150,
    "stream": true,
    "messages": [{"role": "user", "content": "Summarize the concept of cloud computing in 2 sentences."}]
  }' | tail -1
echo ""
echo ""

# Test 4: Another request with different team
echo "4. Non-streaming request (app=search, team=platform)..."
curl -s "$PROXY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-CostTrack-App: search" \
  -H "X-CostTrack-Team: platform" \
  -H "X-CostTrack-Feature: semantic-search" \
  -H "X-CostTrack-Customer-Tier: enterprise" \
  -d '{
    "model": "claude-haiku-4-5-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "What are the three primary colors?"}]
  }' | jq '{model: .model, input_tokens: .usage.input_tokens, output_tokens: .usage.output_tokens}'
echo ""

# Test 5: Check proxy stats
echo "5. Proxy stats..."
curl -s "$PROXY_URL/stats" | jq .
echo ""

# Test 6: Check cost events file
echo "6. Cost events logged:"
if [ -f ./data/cost_events.jsonl ]; then
  cat ./data/cost_events.jsonl | jq -c '{model: .model, cost: .cost_usd, app: .app_id, team: .team, tokens: (.input_tokens + .output_tokens)}'
else
  echo "  (no events file yet — check data directory)"
fi

echo ""
echo "=== Done! Start the API + dashboard to see data visualized ==="
echo "  cd api && npm run dev    (port 3001)"
echo "  cd dashboard && npm run dev  (port 5173)"
