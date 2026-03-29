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

export default function NodePage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">Node.js SDK</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        The ModelTrack Node.js SDK auto-instruments Anthropic and OpenAI calls
        with a single import. Works with TypeScript and JavaScript.
      </p>

      {/* Installation */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Installation</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        For now, copy the SDK file into your project. An <InlineCode>npm</InlineCode>{" "}
        package is coming soon.
      </p>
      <CodeBlock filename="terminal">{`# Copy from the ModelTrack repo
cp modeltrack/sdks/node/modeltrack.ts your-project/

# Coming soon:
# npm install modeltrack`}</CodeBlock>

      {/* Auto-instrumentation */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Auto-instrumentation</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Import <InlineCode>modeltrack</InlineCode> at the top of your entry file.
        All Anthropic and OpenAI SDK instances will automatically route through
        the ModelTrack proxy.
      </p>
      <CodeBlock filename="app.ts">{`import 'modeltrack'  // Add this one line
import Anthropic from '@anthropic-ai/sdk'

// This client now routes through ModelTrack automatically
const client = new Anthropic()
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
})

// OpenAI works the same way
import OpenAI from 'openai'
const openai = new OpenAI()
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
})`}</CodeBlock>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-emerald-400">How it works:</strong> On import,
          the SDK patches the <InlineCode>Anthropic</InlineCode> and{" "}
          <InlineCode>OpenAI</InlineCode> constructors to set{" "}
          <InlineCode>baseURL</InlineCode> to the proxy and inject{" "}
          <InlineCode>X-ModelTrack-*</InlineCode> default headers. If you
          explicitly set <InlineCode>baseURL</InlineCode> in the constructor,
          it won&apos;t be overridden.
        </p>
      </div>

      {/* Manual base URL */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Manual base URL</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        If you prefer not to use auto-instrumentation, set the base URL manually:
      </p>
      <CodeBlock filename="manual.ts">{`import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  baseURL: 'http://localhost:8080'
})

// For OpenAI:
import OpenAI from 'openai'
const openai = new OpenAI({
  baseURL: 'http://localhost:8080'
})`}</CodeBlock>

      {/* Configuration */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Configuration</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Configure the SDK via environment variables or programmatically with{" "}
        <InlineCode>configure()</InlineCode>.
      </p>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">Environment variables</h3>
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
              <td className="py-3 px-4"><InlineCode>MODELTRACK_PROXY_URL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>http://localhost:8080</InlineCode></td>
              <td className="py-3 px-4">Proxy URL</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_TEAM</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Team name for attribution</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_APP</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Application name</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_FEATURE</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Feature name</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_CUSTOMER_TIER</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Customer tier</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_SESSION_ID</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Session ID for multi-step workflows</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_TRACE_ID</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Trace ID for distributed tracing</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>MODELTRACK_PROMPT_TEMPLATE</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Prompt template ID for cost analysis</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">Programmatic configuration</h3>
      <CodeBlock filename="config.ts">{`import { configure } from 'modeltrack'

configure({
  proxyUrl: 'http://localhost:8080',
  team: 'ml-research',
  app: 'chatbot',
  feature: 'customer-support',
  customerTier: 'enterprise',
  promptTemplate: 'support-v2',
})`}</CodeBlock>

      {/* Session tracking */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Session tracking</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Use <InlineCode>withSession()</InlineCode> to group multiple LLM calls
        into a single session. This is useful for multi-step agent workflows.
      </p>
      <CodeBlock filename="sessions.ts">{`import { withSession } from 'modeltrack'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// All calls within this function share the same session ID
await withSession('user-query-123', async () => {
  // Step 1: Classify the query
  const classification = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Classify: refund request' }]
  })

  // Step 2: Generate response
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Handle refund for order #123' }]
  })
})

// With optional trace ID
await withSession('session-123', async () => {
  // ...
}, { traceId: 'trace-456' })`}</CodeBlock>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-yellow-400">Note:</strong>{" "}
          <InlineCode>withSession()</InlineCode> uses module-level state, not
          async context tracking. In concurrent scenarios (e.g., handling
          multiple requests in a server), consider passing session IDs via
          headers instead.
        </p>
      </div>

      {/* Setting team/app/feature */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Setting team, app, and feature</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        You can set attribution at three levels:
      </p>
      <CodeBlock filename="attribution.ts">{`// 1. Environment variables (set once, applies globally)
//    MODELTRACK_TEAM=ml-research
//    MODELTRACK_APP=chatbot
//    MODELTRACK_FEATURE=customer-support

// 2. Programmatic (set once in your app startup)
import { configure } from 'modeltrack'
configure({ team: 'ml-research', app: 'chatbot' })

// 3. Per-client headers (maximum flexibility)
const client = new Anthropic({
  defaultHeaders: {
    'X-ModelTrack-Team': 'ml-research',
    'X-ModelTrack-App': 'chatbot',
    'X-ModelTrack-Feature': 'customer-support',
  }
})`}</CodeBlock>

      {/* Compatibility */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Compatibility</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The Node.js SDK auto-patches these libraries:
      </p>
      <ul className="space-y-2 mb-4">
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#10003;</span>
          <span><InlineCode>@anthropic-ai/sdk</InlineCode> — Anthropic Node.js SDK</span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#10003;</span>
          <span><InlineCode>openai</InlineCode> — OpenAI Node.js SDK</span>
        </li>
      </ul>
      <p className="text-gray-400 leading-relaxed mb-4">
        For frameworks like Vercel AI SDK, see the{" "}
        <Link
          href="/docs/langchain"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Frameworks guide
        </Link>
        .
      </p>
    </>
  );
}
