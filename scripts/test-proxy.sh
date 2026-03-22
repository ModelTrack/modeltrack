#!/bin/bash
# Test script: sends sample requests through the CostTrack proxy
# Usage: ANTHROPIC_API_KEY=sk-... ./scripts/test-proxy.sh

set -e

# Load .env if it exists
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

PROXY_URL="${PROXY_URL:-http://localhost:8080}"
API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY in .env or environment}"

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
    "model": "claude-haiku-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "What is 2+2? Reply in one word."}]
  }'
echo ""
echo "  Response model & tokens:"
tail -1 ./data/cost_events.jsonl 2>/dev/null | jq -c '{model: .model, cost: .cost_usd, input_tokens: .input_tokens, output_tokens: .output_tokens}' 2>/dev/null || echo "  (check proxy logs)"
echo ""

# Test 3: Streaming request (summarizer app, data team)
echo "3. Streaming request (app=summarizer, team=data-eng)..."
curl -sN "$PROXY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-CostTrack-App: summarizer" \
  -H "X-CostTrack-Team: data-eng" \
  -H "X-CostTrack-Feature: doc-summary" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 150,
    "stream": true,
    "messages": [{"role": "user", "content": "Summarize the concept of cloud computing in 2 sentences."}]
  }' > /dev/null 2>&1
sleep 1
echo "  Logged event:"
tail -1 ./data/cost_events.jsonl 2>/dev/null | jq -c '{model: .model, cost: .cost_usd, input_tokens: .input_tokens, output_tokens: .output_tokens}' 2>/dev/null || echo "  (check proxy logs)"
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
    "model": "claude-haiku-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "What are the three primary colors?"}]
  }' > /dev/null 2>&1
sleep 1
echo "  Logged event:"
tail -1 ./data/cost_events.jsonl 2>/dev/null | jq -c '{model: .model, cost: .cost_usd, input_tokens: .input_tokens, output_tokens: .output_tokens}' 2>/dev/null || echo "  (check proxy logs)"
echo ""

# Test 5: Check proxy stats
echo "5. Proxy stats..."
curl -s "$PROXY_URL/stats" | jq .
echo ""

# Test 6: Show last 5 cost events
echo "6. Last 5 cost events logged:"
if [ -f ./data/cost_events.jsonl ]; then
  tail -5 ./data/cost_events.jsonl | jq -c '{model: .model, cost: .cost_usd, app: .app_id, team: .team, tokens: (.input_tokens + .output_tokens)}'
else
  echo "  (no events file yet — check data directory)"
fi

echo ""
echo "=== Done! Start the API + dashboard to see data visualized ==="
echo "  cd api && npm run dev    (port 3001)"
echo "  cd dashboard && npm run dev  (port 5173)"
