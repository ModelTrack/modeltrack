# CostTrack SDKs

Lightweight wrappers that auto-instrument LLM calls to route through the CostTrack proxy. No code changes required beyond a single import.

## Installation

These are standalone source files. Copy the one you need into your project:

```bash
# Python
cp sdks/python/costtrack.py /path/to/your/project/

# Node.js / TypeScript
cp sdks/node/costtrack.ts /path/to/your/project/
```

## Quick Start

### Python

```python
import costtrack  # Add this line at the top of your app

import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "Hello!"}],
)
```

That is it. All Anthropic and OpenAI calls are now routed through the CostTrack proxy with full cost tracking.

### Node.js / TypeScript

```typescript
import './costtrack'  // Add this line at the top of your app

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const response = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

## Configuration

### Environment Variables

Both SDKs read from the same environment variables:

| Variable | Description | Default |
|---|---|---|
| `COSTTRACK_PROXY_URL` | URL of the CostTrack proxy | `http://localhost:8080` |
| `COSTTRACK_TEAM` | Team identifier for cost attribution | (empty) |
| `COSTTRACK_APP` | Application identifier | (empty) |
| `COSTTRACK_FEATURE` | Feature identifier | (empty) |
| `COSTTRACK_CUSTOMER_TIER` | Customer tier (e.g., `free`, `enterprise`) | (empty) |
| `COSTTRACK_SESSION_ID` | Default session ID for grouping requests | (empty) |

### Programmatic Configuration

#### Python

```python
import costtrack

costtrack.configure(
    proxy_url="http://costtrack.internal:8080",
    team="platform",
    app="search",
    feature="semantic-search",
    customer_tier="enterprise",
)
```

#### Node.js / TypeScript

```typescript
import { configure } from './costtrack'

configure({
  proxyUrl: 'http://costtrack.internal:8080',
  team: 'platform',
  app: 'search',
  feature: 'semantic-search',
  customerTier: 'enterprise',
})
```

## Session Tracking

Group related LLM calls under a single session ID for end-to-end visibility.

### Python

```python
import costtrack

with costtrack.session("user-query-123"):
    # All LLM calls in this block share the same session ID.
    response = client.messages.create(...)
    followup = client.messages.create(...)
```

The context manager is thread-safe. Each thread can have its own active session.

### Node.js / TypeScript

```typescript
import { withSession } from './costtrack'

await withSession('user-query-123', async () => {
  // All LLM calls in this callback share the same session ID.
  const response = await client.messages.create({ ... })
  const followup = await client.messages.create({ ... })
})
```

## Opt-Out Per Request

### Skip Proxy Routing

If you need a specific request to bypass CostTrack's model routing rules, add the opt-out header:

```python
# Python (Anthropic)
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    messages=[{"role": "user", "content": "Important query"}],
    extra_headers={"X-CostTrack-No-Route": "true"},
)
```

```typescript
// Node.js (Anthropic)
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'Important query' }],
}, {
  headers: { 'X-CostTrack-No-Route': 'true' },
})
```

### Skip Response Caching

```python
# Python
response = client.messages.create(
    ...,
    extra_headers={"X-CostTrack-No-Cache": "true"},
)
```

## Supported SDKs

| SDK | Status |
|---|---|
| `anthropic` (Python) | Supported |
| `openai` (Python) | Supported |
| `@anthropic-ai/sdk` (Node) | Supported |
| `openai` (Node) | Supported |

## How It Works

On import, the SDK monkey-patches the constructor of supported LLM client classes. When you create a new client instance, the patched constructor:

1. Redirects the `base_url` / `baseURL` to the CostTrack proxy (unless you explicitly set one).
2. Injects `X-CostTrack-*` headers from your environment variables or programmatic configuration.
3. Leaves everything else untouched -- all SDK features (streaming, tool use, etc.) work as normal.

The proxy forwards requests to the real LLM provider, records usage and cost data, and returns the response transparently.

## Troubleshooting

**SDK not being patched:** The LLM SDK must be installed before `costtrack` can patch it. If the SDK is not found at import time, CostTrack logs a debug message and continues without error.

**Headers not showing up:** Make sure you import `costtrack` _before_ creating any client instances. The patch applies to new instances only.

**Using a custom base_url:** If you explicitly pass `base_url` / `baseURL` when constructing a client, CostTrack will not override it. This lets you opt out of proxying for specific clients.
