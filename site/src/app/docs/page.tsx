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

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center size-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold flex-shrink-0">
      {n}
    </span>
  );
}

export default function QuickstartPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">Get started in 5 minutes</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        ModelTrack is a reverse proxy that sits between your app and every LLM API.
        It tracks tokens, enforces budgets, routes to cheaper models, and caches
        responses — all in real-time, with zero code changes.
      </p>

      {/* Step 1 */}
      <div className="flex items-start gap-4 mt-12 mb-4">
        <StepNumber n={1} />
        <h2 className="text-xl font-semibold text-white pt-0.5">Start ModelTrack</h2>
      </div>
      <p className="text-gray-400 leading-relaxed mb-4">
        Clone the repo and start all services with Docker Compose.
      </p>
      <CodeBlock filename="terminal">{`git clone https://github.com/ModelTrack/modeltrack.git
cd modeltrack
docker compose up`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-2 mt-4">
        Once everything is running, you have three services:
      </p>
      <ul className="space-y-2 mb-4 ml-1">
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">Proxy</strong> at <InlineCode>localhost:8080</InlineCode></span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">Dashboard</strong> at <InlineCode>localhost:5173</InlineCode></span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">API</strong> at <InlineCode>localhost:3001</InlineCode></span>
        </li>
      </ul>

      {/* Step 2 */}
      <div className="flex items-start gap-4 mt-12 mb-4">
        <StepNumber n={2} />
        <h2 className="text-xl font-semibold text-white pt-0.5">Point your app at the proxy</h2>
      </div>
      <p className="text-gray-400 leading-relaxed mb-4">
        The fastest way is auto-instrumentation — just import the SDK and all LLM
        calls are automatically routed through ModelTrack.
      </p>

      <p className="text-sm font-semibold text-white mb-2">Python</p>
      <CodeBlock filename="app.py">{`import modeltrack  # Auto-patches Anthropic + OpenAI SDKs
import anthropic

client = anthropic.Anthropic()  # Already points to ModelTrack proxy
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)`}</CodeBlock>

      <p className="text-sm font-semibold text-white mb-2 mt-6">Node.js / TypeScript</p>
      <CodeBlock filename="app.ts">{`import 'modeltrack'  // Auto-patches Anthropic + OpenAI SDKs
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()  // Already points to ModelTrack proxy
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
})`}</CodeBlock>

      <p className="text-gray-400 leading-relaxed mt-4 mb-4">
        Or, if you prefer not to use auto-instrumentation, manually set the base URL:
      </p>
      <CodeBlock filename="manual.py">{`# Python — manual base URL
client = anthropic.Anthropic(base_url="http://localhost:8080")

# OpenAI
client = openai.OpenAI(base_url="http://localhost:8080")`}</CodeBlock>

      {/* Step 3 */}
      <div className="flex items-start gap-4 mt-12 mb-4">
        <StepNumber n={3} />
        <h2 className="text-xl font-semibold text-white pt-0.5">Add attribution headers (optional but recommended)</h2>
      </div>
      <p className="text-gray-400 leading-relaxed mb-4">
        Attribution headers tell ModelTrack <em>who</em> is making each request.
        This enables per-team cost tracking, budget enforcement, and feature-level analytics.
      </p>
      <CodeBlock filename="headers.py">{`headers = {
    "X-ModelTrack-Team": "ml-research",
    "X-ModelTrack-App": "chatbot",
    "X-ModelTrack-Feature": "customer-support",
}`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Or configure them globally with the SDK:
      </p>
      <CodeBlock>{`import modeltrack
modeltrack.configure(team="ml-research", app="chatbot", feature="customer-support")`}</CodeBlock>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-emerald-400">Tip:</strong> All{" "}
          <InlineCode>X-ModelTrack-*</InlineCode> headers are optional. The proxy
          works without them — you just won't get team/feature-level attribution.
        </p>
      </div>

      {/* Step 4 */}
      <div className="flex items-start gap-4 mt-12 mb-4">
        <StepNumber n={4} />
        <h2 className="text-xl font-semibold text-white pt-0.5">Open the dashboard</h2>
      </div>
      <p className="text-gray-400 leading-relaxed mb-4">
        Go to{" "}
        <a
          href="http://localhost:5173"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          localhost:5173
        </a>{" "}
        in your browser. You should see your first requests appearing within seconds.
      </p>
      <p className="text-gray-400 leading-relaxed mb-4">
        The dashboard shows real-time cost tracking, token usage, model breakdowns,
        team attribution, and more — across 11 pages of analytics.
      </p>

      {/* Done */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6 mt-12">
        <p className="text-lg font-semibold text-white mb-2">
          That&apos;s it! Your AI costs are now tracked.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Every LLM request now flows through ModelTrack. You get per-request
          cost tracking, token-level granularity, team attribution, and real-time
          dashboards — with zero changes to your application logic.
        </p>
      </div>

      {/* Next steps */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Next steps</h2>
      <ul className="space-y-2">
        {[
          { label: "Python SDK guide", href: "/docs/python" },
          { label: "Node.js SDK guide", href: "/docs/node" },
          { label: "LangChain & framework integrations", href: "/docs/langchain" },
          { label: "Docker & deployment", href: "/docs/docker" },
          { label: "Configuration reference", href: "/docs/configuration" },
          { label: "API keys & security", href: "/docs/api-keys" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-emerald-400 text-sm hover:text-emerald-300 underline underline-offset-2"
            >
              {link.label} &#8594;
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
