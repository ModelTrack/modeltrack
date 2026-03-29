# ModelTrack Roadmap to Beta

## Current State: Alpha (Internal Testing)

### What's Built
- [x] Go LLM proxy (Anthropic, OpenAI, Bedrock, Azure)
- [x] Response caching (20-50% savings)
- [x] Budget enforcement (warn + block)
- [x] Cost-aware model routing
- [x] Session/trace tracking
- [x] Prompt cost analysis
- [x] Cost forecasting with scenarios
- [x] Pre-deployment cost estimator
- [x] Executive reports with CSV export + Slack delivery
- [x] Infrastructure collector (AWS CUR, OpenCost, GPU metrics)
- [x] 11-page self-hosted dashboard
- [x] Python + Node.js SDKs
- [x] Marketing website (modeltrack.ai)
- [x] Documentation site (/docs)
- [x] Public status page with live monitoring (/status)
- [x] Firebase model monitor (9 models, 5-min pings)
- [x] Cloud app with auth (Firebase Auth + Firestore)

---

## Phase 1: Cloud MVP (Weeks 1-2)
*Goal: A user can sign up, get a proxy URL, and see their data in a dashboard.*

- [ ] Cloud proxy on Cloud Run (multi-tenant, writes to Firestore)
- [ ] Cloud Functions API (reads from Firestore, serves dashboard data)
- [ ] Wire cloud dashboard to Cloud Functions API
- [ ] Deploy cloud proxy to Cloud Run
- [ ] Deploy Cloud Functions
- [ ] Deploy cloud dashboard to Netlify (app.modeltrack.ai)
- [ ] DNS: proxy.modeltrack.ai → Cloud Run
- [ ] DNS: app.modeltrack.ai → Netlify
- [ ] End-to-end test: sign up → get proxy URL → send request → see it in dashboard
- [ ] Onboarding flow polish (copy button works, instructions are clear)

## Phase 2: Core Cloud Features (Weeks 3-4)
*Goal: Feature parity with the self-hosted dashboard for the most important views.*

- [ ] Overview page with real data (spend today/week/month, top model, top team, trend chart)
- [ ] Models page (cost breakdown by model)
- [ ] Teams page (cost breakdown by team)
- [ ] Features page (cost per AI feature)
- [ ] Sessions page (multi-step workflow tracking)
- [ ] Alerts page (anomaly detection from Firestore data)
- [ ] Budget configuration UI (set budgets per team/app in the cloud dashboard)
- [ ] Budget enforcement in cloud proxy (read budgets from Firestore)

## Phase 3: Polish & Trust (Weeks 5-6)
*Goal: Good enough for external users to trust with their API traffic.*

- [ ] SSL/TLS verification on proxy (users need to trust it)
- [ ] Rate limiting on cloud proxy (per workspace)
- [ ] Workspace invite flow (invite team members by email)
- [ ] Usage limits on free tier (e.g., 100K events/month)
- [ ] Error handling + logging (structured logs in Cloud Logging)
- [ ] Uptime monitoring for the cloud proxy itself
- [ ] Privacy policy + terms of service pages
- [ ] Security page (how API keys are handled, data flow diagram)

## Phase 4: Beta Launch (Week 7-8)
*Goal: Public beta with real users.*

- [ ] Publish Python SDK to PyPI (`pip install modeltrack`)
- [ ] Publish Node SDK to npm (`npm install modeltrack`)
- [ ] Push Docker images to Docker Hub (`docker pull modeltrack/proxy`)
- [ ] Write launch blog post
- [ ] Post Show HN
- [ ] Post to r/MachineLearning, r/LocalLLaMA, r/devops
- [ ] Submit to Product Hunt
- [ ] Hacker News "Show HN: ModelTrack — open-source real-time AI cost control"
- [ ] Share in FinOps Foundation Slack
- [ ] Add GitHub star badge to README and website

## Phase 5: Post-Beta (Months 3-4)
*Goal: Paid conversions, retention, and growth.*

- [ ] Stripe billing integration (free → pro → enterprise tiers)
- [ ] Response caching in cloud proxy
- [ ] Model routing in cloud proxy
- [ ] Prompt analysis in cloud proxy
- [ ] Cost forecasting in cloud dashboard
- [ ] Pre-deployment estimator in cloud dashboard
- [ ] Weekly email reports (in addition to Slack)
- [ ] MCP server (expose cost data to AI assistants)
- [ ] Terraform provider (manage budgets/routing as code)
- [ ] GitHub Action for CI/CD cost impact comments on PRs
- [ ] Helm chart for self-hosted K8s deployment
- [ ] SOC 2 Type I preparation

---

## Success Metrics for Beta

| Metric | Target |
|---|---|
| Sign ups | 100 accounts |
| Active workspaces (sent >1 request) | 30 |
| GitHub stars | 500 |
| Weekly active dashboard users | 20 |
| Requests proxied | 100K total |
| Net Promoter Score | >40 |

## Non-Goals for Beta
- Multi-cloud infrastructure monitoring (GPU, SageMaker) — self-hosted only
- Enterprise features (SSO, RBAC, audit logs) — post-beta
- Mobile app
- On-premise deployment support
