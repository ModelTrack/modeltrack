<p align="center">
  <h1 align="center"><span style="color: #10b981">Model</span>Track</h1>
  <p align="center">Real-time AI cost control</p>
</p>

<p align="center">
  <a href="https://modeltrack.ai">Website</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="https://modeltrack.ai/docs">Docs</a>
</p>

---

ModelTrack is an open-source proxy that sits between your app and every LLM API. It tracks tokens, enforces budgets, routes to cheaper models, and caches responses — all in real-time, with zero code changes.

## Why ModelTrack?

Traditional FinOps tools read your cloud bill after the fact. ModelTrack is **in the request path** — it sees every token, controls every dollar, and acts in real-time.

| | Traditional FinOps | ModelTrack |
|---|---|---|
| **When** | Hours/days after the bill | Real-time, per request |
| **Granularity** | Service-level totals | Per-request, per-token |
| **Control** | Dashboards and alerts | Block, route, cache, enforce |
| **Attribution** | Tag-based (if tagged) | Header-based (team, app, feature, customer) |

## Features

- **Multi-provider proxy** — Anthropic, OpenAI, AWS Bedrock, Azure OpenAI
- **Token-level cost tracking** — input, output, cache read/write tokens per request
- **Team/app/feature attribution** — via `X-ModelTrack-*` headers
- **Budget enforcement** — warn or block when teams exceed monthly limits
- **Smart model routing** — auto-downgrade to cheaper models near budget limits
- **Response caching** — eliminate duplicate API calls, 20-50% cost reduction
- **Session tracking** — trace costs across multi-step agent workflows
- **Prompt analysis** — identify expensive prompt patterns with optimization suggestions
- **Cost forecasting** — linear regression with confidence intervals and scenarios
- **Pre-deployment estimator** — predict costs before shipping new features
- **Executive reports** — weekly/monthly reports with CSV export and Slack delivery
- **Infrastructure collector** — AWS Cost Explorer, OpenCost, GPU metrics integration
- **11-page dashboard** — Overview, Models, Features, Prompts, Teams, Sessions, Forecast, Estimator, Reports, Alerts, Infrastructure

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
git clone https://github.com/modeltrack/modeltrack.git
cd modeltrack
docker compose up
```

Dashboard at `http://localhost:5173`, proxy at `http://localhost:8080`.

### Option 2: Run locally

```bash
# Terminal 1: Proxy
cd proxy && go run .

# Terminal 2: API
cd api && npm install && npm run dev

# Terminal 3: Dashboard
cd dashboard && npm install && npm run dev
```

### Point your LLM SDK at the proxy

```python
import modeltrack  # Auto-patches Anthropic + OpenAI SDKs

# Or manually set the base URL:
client = anthropic.Anthropic(base_url="http://localhost:8080")
```

### Add attribution headers

```python
# These headers tell ModelTrack who's making the request
headers = {
    "X-ModelTrack-Team": "ml-research",
    "X-ModelTrack-App": "chatbot",
    "X-ModelTrack-Feature": "customer-support",
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Your Application                      │
│                                                           │
│  client.messages.create(model="claude-sonnet-4-6", ...)  │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                   ModelTrack Proxy (Go)                    │
│                                                           │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐   │
│  │ Budget  │ │ Router   │ │ Cache  │ │ Cost Logger  │   │
│  │ Check   │ │ (model   │ │ (LRU,  │ │ (async,      │   │
│  │ (block/ │ │ downgrade│ │ SHA256 │ │  JSONL)      │   │
│  │  warn)  │ │ on budget│ │ key)   │ │              │   │
│  └─────────┘ └──────────┘ └────────┘ └──────────────┘   │
└──────────────────────┬────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Anthropic      OpenAI      Bedrock/Azure
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PROXY_PORT` | `8080` | Proxy listen port |
| `DATA_DIR` | `../data` | Directory for cost events and config |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Anthropic API endpoint |
| `OPENAI_BASE_URL` | `https://api.openai.com` | OpenAI API endpoint |
| `CACHE_ENABLED` | `true` | Enable response caching |
| `CACHE_TTL_SECONDS` | `3600` | Cache entry TTL |
| `SLACK_WEBHOOK_URL` | — | Slack webhook for alerts |

### Budget Configuration (`data/budgets.json`)

```json
{
  "budgets": [
    {"team": "ml-research", "app": "", "monthly_limit": 500.00, "action": "block"},
    {"team": "product", "app": "chatbot", "monthly_limit": 200.00, "action": "warn"}
  ]
}
```

### Routing Configuration (`data/routing.json`)

```json
{
  "rules": [
    {
      "name": "budget-downgrade",
      "trigger": "budget_percent_above",
      "threshold": 70,
      "from_models": ["claude-sonnet-4-6"],
      "to_model": "claude-haiku-4-5",
      "provider": "anthropic",
      "action": "downgrade",
      "enabled": true
    }
  ]
}
```

## SDKs

### Python

```python
import modeltrack

# Configure (or use MODELTRACK_* env vars)
modeltrack.configure(team="ml-research", app="chatbot")

# Session tracking for multi-step workflows
with modeltrack.session("user-query-123"):
    response = client.messages.create(...)
```

### Node.js / TypeScript

```typescript
import 'modeltrack'

// Configure (or use MODELTRACK_* env vars)
import { configure, withSession } from 'modeltrack'
configure({ team: 'ml-research', app: 'chatbot' })

// Session tracking
await withSession('user-query-123', async () => {
  const response = await client.messages.create(...)
})
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /healthz` | Health check |
| `GET /stats` | Proxy statistics |
| `GET /cache/stats` | Cache hit rate and savings |
| `GET /routing/stats` | Routing decisions and savings |
| `POST /v1/messages` | Anthropic proxy |
| `POST /v1/chat/completions` | OpenAI proxy |
| `POST /bedrock/v1/messages` | AWS Bedrock proxy |
| `POST /azure/v1/chat/completions` | Azure OpenAI proxy |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <a href="https://modeltrack.ai">modeltrack.ai</a>
</p>
