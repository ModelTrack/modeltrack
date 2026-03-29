#!/bin/bash
# Simulates a real team using ModelTrack with diverse requests across
# multiple apps, teams, features, and models.
# Usage: ./scripts/test-app.sh

set -e

# Load .env
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

PROXY_URL="${PROXY_URL:-http://localhost:8080}"
API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY in .env}"

echo "=== ModelTrack Test App ==="
echo "Proxy: $PROXY_URL"
echo "Sending diverse requests to populate dashboard..."
echo ""

# Helper function to send a request
send_request() {
  local team="$1"
  local app="$2"
  local feature="$3"
  local model="$4"
  local prompt="$5"
  local session="$6"
  local system_prompt="$7"
  local max_tokens="${8:-30}"

  local body="{\"model\": \"$model\", \"max_tokens\": $max_tokens, \"messages\": [{\"role\": \"user\", \"content\": \"$prompt\"}]"
  if [ -n "$system_prompt" ]; then
    body="$body, \"system\": \"$system_prompt\""
  fi
  body="$body}"

  local headers="-H 'Content-Type: application/json' -H 'x-api-key: $API_KEY' -H 'anthropic-version: 2023-06-01'"
  headers="$headers -H 'X-ModelTrack-Team: $team'"
  headers="$headers -H 'X-ModelTrack-App: $app'"
  headers="$headers -H 'X-ModelTrack-Feature: $feature'"

  if [ -n "$session" ]; then
    headers="$headers -H 'X-ModelTrack-Session-ID: $session'"
  fi

  eval curl -s "$PROXY_URL/v1/messages" $headers -d "'$body'" > /dev/null 2>&1
  echo "  ✓ $team/$app/$feature ($model)"
}

echo "--- Product Team: Chatbot ---"
send_request "product" "chatbot" "customer-support" "claude-haiku-4-5" "What is your return policy?" "session-chat-001" "You are a helpful customer support agent. Be concise."
send_request "product" "chatbot" "customer-support" "claude-haiku-4-5" "How do I cancel my subscription?" "session-chat-001" "You are a helpful customer support agent. Be concise."
send_request "product" "chatbot" "customer-support" "claude-haiku-4-5" "Where is my order?" "session-chat-002" "You are a helpful customer support agent. Be concise."
send_request "product" "chatbot" "onboarding" "claude-haiku-4-5" "How do I get started?" "session-chat-003" "You are an onboarding assistant. Guide users step by step."
send_request "product" "chatbot" "sales-assist" "claude-sonnet-4-6" "Compare your enterprise and pro plans" "session-chat-004" "You are a sales assistant. Be persuasive but honest."

echo ""
echo "--- Data Engineering: Summarizer ---"
send_request "data-eng" "summarizer" "doc-summary" "claude-haiku-4-5" "Summarize: Cloud computing grew 40% in 2025, driven by AI workloads." "" "Summarize the text concisely in 1-2 sentences."
send_request "data-eng" "summarizer" "doc-summary" "claude-haiku-4-5" "Summarize: The FinOps market is projected to reach 5 billion by 2028." "" "Summarize the text concisely in 1-2 sentences."
send_request "data-eng" "summarizer" "email-digest" "claude-haiku-4-5" "Summarize this email thread: Meeting moved to Thursday. Budget approved. New hire starts Monday." "" "Create a brief email digest."
send_request "data-eng" "classifier" "intent-detection" "claude-haiku-4-5" "I want to cancel my account and get a refund" "" "Classify the user intent. Respond with one word: billing, support, cancel, or other."
send_request "data-eng" "classifier" "sentiment" "claude-haiku-4-5" "This product is amazing, best purchase ever!" "" "Classify sentiment as: positive, negative, or neutral. One word."

echo ""
echo "--- ML Research: Evaluation ---"
send_request "ml-research" "eval-harness" "model-eval" "claude-sonnet-4-6" "What is the capital of France? Answer in one word." "" ""
send_request "ml-research" "eval-harness" "model-eval" "claude-haiku-4-5" "What is the capital of France? Answer in one word." "" ""
send_request "ml-research" "eval-harness" "regression-test" "claude-sonnet-4-6" "Solve: 2x + 3 = 11. What is x?" "" "You are a math tutor. Show your work."
send_request "ml-research" "benchmark" "latency-bench" "claude-haiku-4-5" "Say hi" "" "" 5
send_request "ml-research" "benchmark" "latency-bench" "claude-sonnet-4-6" "Say hi" "" "" 5

echo ""
echo "--- Platform: Code Review & Docs ---"
send_request "platform" "code-review" "pr-review" "claude-sonnet-4-6" "Review this code: function add(a,b) { return a + b; }" "session-pr-101" "You are a senior code reviewer. Be thorough but kind." 50
send_request "platform" "code-review" "security-scan" "claude-sonnet-4-6" "Check for security issues: const query = 'SELECT * FROM users WHERE id = ' + userId" "session-pr-101" "You are a security auditor. Flag any vulnerabilities." 50
send_request "platform" "docs-qa" "api-docs" "claude-haiku-4-5" "How do I authenticate with the REST API?" "" "You are a documentation assistant for a REST API."
send_request "platform" "incident-bot" "alert-triage" "claude-haiku-4-5" "CPU at 95% on prod-web-3 for 10 minutes" "" "You are an incident response bot. Assess severity and suggest actions."

echo ""
echo "--- Duplicate requests (test caching) ---"
send_request "product" "chatbot" "faq" "claude-haiku-4-5" "What are your business hours?" "" "Answer FAQ questions concisely."
send_request "product" "chatbot" "faq" "claude-haiku-4-5" "What are your business hours?" "" "Answer FAQ questions concisely."
send_request "product" "chatbot" "faq" "claude-haiku-4-5" "What are your business hours?" "" "Answer FAQ questions concisely."

echo ""
echo "=== Done! Sent 22 requests across 4 teams, 7 apps, 12 features ==="
echo ""
echo "Check the dashboard at http://localhost:5174"
echo "Proxy stats: $(curl -s $PROXY_URL/stats)"
echo "Cache stats: $(curl -s $PROXY_URL/cache/stats)"
