import Link from "next/link";

function CodeBlock({ children, filename }: { children: string; filename?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gray-900 overflow-hidden my-4">
      {filename && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-xs text-gray-500 font-mono">{filename}</span>
        </div>
      )}
      <pre className="p-4 text-sm leading-relaxed overflow-x-auto font-mono text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-emerald-400 text-sm font-mono">
      {children}
    </code>
  );
}

export default function ConfigurationPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">Configuration Reference</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        Complete reference for all ModelTrack configuration options: environment
        variables, JSON config files, and runtime settings.
      </p>

      {/* Proxy env vars */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Proxy environment variables</h2>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Variable</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Default</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>PROXY_PORT</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>8080</InlineCode></td>
              <td className="py-3 px-4">Port the proxy listens on</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DATA_DIR</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>../data</InlineCode></td>
              <td className="py-3 px-4">Directory for JSONL cost events and config files</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>ANTHROPIC_BASE_URL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>https://api.anthropic.com</InlineCode></td>
              <td className="py-3 px-4">Upstream Anthropic API endpoint</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>OPENAI_BASE_URL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>https://api.openai.com</InlineCode></td>
              <td className="py-3 px-4">Upstream OpenAI API endpoint</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>LOG_LEVEL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>info</InlineCode></td>
              <td className="py-3 px-4">Logging verbosity (debug, info, warn, error)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cache settings */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Cache settings</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The proxy includes an in-memory LRU response cache. Identical requests
        (same model, messages, system prompt, and temperature) return cached
        responses, saving both cost and latency.
      </p>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Variable</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Default</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>CACHE_ENABLED</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>true</InlineCode></td>
              <td className="py-3 px-4">Enable or disable the response cache</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>CACHE_TTL_SECONDS</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>3600</InlineCode></td>
              <td className="py-3 px-4">Time-to-live for cached entries (seconds)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>CACHE_MAX_ENTRIES</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>1000</InlineCode></td>
              <td className="py-3 px-4">Maximum number of cached responses</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-gray-400 leading-relaxed mb-4">
        The cache key is a SHA-256 hash of the model, messages, system prompt,
        and temperature. Streaming requests are not cached.
      </p>

      {/* API env vars */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">API environment variables</h2>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Variable</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Default</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>PORT</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>3001</InlineCode></td>
              <td className="py-3 px-4">API server listen port</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DATA_DIR</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>/data</InlineCode></td>
              <td className="py-3 px-4">Directory for cost events and config files</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DB_PATH</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>/data/modeltrack.db</InlineCode></td>
              <td className="py-3 px-4">SQLite database file path</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>SLACK_WEBHOOK_URL</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Slack incoming webhook for alerts and reports</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* budgets.json */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Budget configuration</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Budgets are defined in <InlineCode>data/budgets.json</InlineCode>. The
        proxy reads this file on startup and watches for changes.
      </p>
      <CodeBlock filename="data/budgets.json">{`{
  "budgets": [
    {
      "team": "ml-research",
      "app": "",
      "monthly_limit": 500.00,
      "action": "block"
    },
    {
      "team": "product",
      "app": "chatbot",
      "monthly_limit": 200.00,
      "action": "warn"
    },
    {
      "team": "product",
      "app": "search",
      "monthly_limit": 100.00,
      "action": "block"
    }
  ]
}`}</CodeBlock>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Field</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>team</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Team name (matched against X-ModelTrack-Team header)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>app</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">App name (empty string means all apps for that team)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>monthly_limit</InlineCode></td>
              <td className="py-3 px-4">number</td>
              <td className="py-3 px-4">Monthly budget in USD</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>action</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4"><InlineCode>block</InlineCode> (reject requests) or <InlineCode>warn</InlineCode> (log + allow)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* routing.json */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Routing configuration</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Routing rules are defined in <InlineCode>data/routing.json</InlineCode>.
        They allow the proxy to automatically downgrade to cheaper models when
        teams approach their budget limits.
      </p>
      <CodeBlock filename="data/routing.json">{`{
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
    },
    {
      "name": "openai-budget-downgrade",
      "trigger": "budget_percent_above",
      "threshold": 80,
      "from_models": ["gpt-4o"],
      "to_model": "gpt-4o-mini",
      "provider": "openai",
      "action": "downgrade",
      "enabled": true
    }
  ]
}`}</CodeBlock>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Field</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>name</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Human-readable rule name</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>trigger</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Trigger type (e.g., <InlineCode>budget_percent_above</InlineCode>)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>threshold</InlineCode></td>
              <td className="py-3 px-4">number</td>
              <td className="py-3 px-4">Budget percentage that activates the rule (0-100)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>from_models</InlineCode></td>
              <td className="py-3 px-4">string[]</td>
              <td className="py-3 px-4">Models to downgrade from</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>to_model</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Cheaper model to route to</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>provider</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Provider (anthropic, openai)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>action</InlineCode></td>
              <td className="py-3 px-4">string</td>
              <td className="py-3 px-4">Action to take (<InlineCode>downgrade</InlineCode>)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>enabled</InlineCode></td>
              <td className="py-3 px-4">boolean</td>
              <td className="py-3 px-4">Whether the rule is active</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* namespace_map.json */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Collector namespace map</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The collector uses <InlineCode>data/namespace_map.json</InlineCode> to
        map Kubernetes namespaces to ModelTrack teams for infrastructure cost
        attribution.
      </p>
      <CodeBlock filename="data/namespace_map.json">{`{
  "ml-research": "ml-research",
  "product-chatbot": "product",
  "default": "platform"
}`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Keys are Kubernetes namespace names, values are ModelTrack team names.
        This allows the collector to attribute infrastructure costs (GPU, compute)
        to the correct team in the dashboard.
      </p>

      {/* Proxy route paths */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Proxy route paths</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The proxy routes requests based on URL path:
      </p>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Path</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Provider</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/v1/messages</InlineCode></td>
              <td className="py-3 px-4">Anthropic</td>
              <td className="py-3 px-4">Anthropic Messages API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/v1/chat/completions</InlineCode></td>
              <td className="py-3 px-4">OpenAI</td>
              <td className="py-3 px-4">OpenAI Chat Completions API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/bedrock/v1/messages</InlineCode></td>
              <td className="py-3 px-4">AWS Bedrock</td>
              <td className="py-3 px-4">AWS Bedrock Messages API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/azure/v1/chat/completions</InlineCode></td>
              <td className="py-3 px-4">Azure OpenAI</td>
              <td className="py-3 px-4">Azure OpenAI Chat Completions API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/healthz</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Health check endpoint</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/stats</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Proxy statistics</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/cache/stats</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Cache hit rate and savings</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>/routing/stats</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Routing decisions and savings</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
