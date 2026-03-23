"""
Example: Using ModelTrack with the Anthropic Python SDK.

Before running:
  1. Start the ModelTrack proxy:  cd proxy && go run .
  2. Set your API key:           export ANTHROPIC_API_KEY=sk-ant-...
  3. Set ModelTrack metadata:     export MODELTRACK_TEAM=my-team
                                 export MODELTRACK_APP=my-app

Then run:
  python example.py
"""

# This single import auto-patches the Anthropic SDK.
import modeltrack

import anthropic

# Optional: configure programmatically instead of (or in addition to) env vars.
modeltrack.configure(
    team="product",
    app="chatbot",
    feature="customer-support",
)

# Create the client as usual -- no base_url change needed.
client = anthropic.Anthropic()

# Simple request -- automatically routed through ModelTrack proxy.
response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "What is ModelTrack?"}],
)

print("Response:", response.content[0].text)

# Session tracking -- group related calls under one session ID.
with modeltrack.session("user-query-456"):
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": "Summarize the previous answer."}],
    )
    print("Session response:", response.content[0].text)
