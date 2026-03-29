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

export default function PythonPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">Python SDK</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        The ModelTrack Python SDK auto-instruments Anthropic and OpenAI calls
        with a single import. No code changes required.
      </p>

      {/* Installation */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Installation</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        For now, copy the SDK file into your project. A <InlineCode>pip install</InlineCode>{" "}
        package is coming soon.
      </p>
      <CodeBlock filename="terminal">{`# Copy from the ModelTrack repo
cp modeltrack/sdks/python/modeltrack.py your-project/

# Coming soon:
# pip install modeltrack`}</CodeBlock>

      {/* Auto-instrumentation */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Auto-instrumentation</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Import <InlineCode>modeltrack</InlineCode> at the top of your app. That&apos;s it.
        All Anthropic and OpenAI SDK instances will automatically route through
        the ModelTrack proxy and include attribution headers.
      </p>
      <CodeBlock filename="app.py">{`import modeltrack  # Add this one line
import anthropic

# This client now routes through ModelTrack automatically
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)

# OpenAI works the same way
import openai
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)`}</CodeBlock>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-emerald-400">How it works:</strong> On import,
          the SDK monkey-patches <InlineCode>anthropic.Anthropic.__init__</InlineCode> and{" "}
          <InlineCode>openai.OpenAI.__init__</InlineCode> to set{" "}
          <InlineCode>base_url</InlineCode> to the proxy and inject{" "}
          <InlineCode>X-ModelTrack-*</InlineCode> headers. If you explicitly set{" "}
          <InlineCode>base_url</InlineCode> in the constructor, it won&apos;t be overridden.
        </p>
      </div>

      {/* Manual base URL */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Manual base URL</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        If you prefer not to use auto-instrumentation, set the base URL manually:
      </p>
      <CodeBlock filename="manual.py">{`import anthropic

client = anthropic.Anthropic(base_url="http://localhost:8080")
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)

# For OpenAI:
import openai
client = openai.OpenAI(base_url="http://localhost:8080")`}</CodeBlock>

      {/* Configuration */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Configuration</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Configure the SDK either via environment variables or programmatically
        with <InlineCode>modeltrack.configure()</InlineCode>.
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
              <td className="py-3 px-4">Customer tier (e.g., enterprise, free)</td>
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
      <CodeBlock filename="config.py">{`import modeltrack

modeltrack.configure(
    proxy_url="http://localhost:8080",
    team="ml-research",
    app="chatbot",
    feature="customer-support",
    customer_tier="enterprise",
    prompt_template="support-v2",
)`}</CodeBlock>

      {/* Session tracking */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Session tracking</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Use the <InlineCode>session()</InlineCode> context manager to group
        multiple LLM calls into a single session. This is useful for multi-step
        agent workflows where you want to track the total cost of a conversation
        or task.
      </p>
      <CodeBlock filename="sessions.py">{`import modeltrack
import anthropic

client = anthropic.Anthropic()

# All calls within this block share the same session ID
with modeltrack.session("user-query-123"):
    # Step 1: Classify the query
    classification = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,
        messages=[{"role": "user", "content": "Classify: refund request"}]
    )

    # Step 2: Generate response
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Handle refund for order #123"}]
    )

# With optional trace ID for distributed tracing
with modeltrack.session("session-123", trace_id="trace-456"):
    response = client.messages.create(...)`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Sessions are thread-safe — each thread gets its own session context
        via thread-local storage.
      </p>

      {/* Setting team/app/feature */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Setting team, app, and feature</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        You can set attribution at three levels:
      </p>
      <CodeBlock filename="attribution.py">{`# 1. Environment variables (set once, applies globally)
#    MODELTRACK_TEAM=ml-research
#    MODELTRACK_APP=chatbot
#    MODELTRACK_FEATURE=customer-support

# 2. Programmatic (set once in your app startup)
import modeltrack
modeltrack.configure(team="ml-research", app="chatbot")

# 3. Per-request headers (maximum flexibility)
client = anthropic.Anthropic(
    default_headers={
        "X-ModelTrack-Team": "ml-research",
        "X-ModelTrack-App": "chatbot",
        "X-ModelTrack-Feature": "customer-support",
    }
)`}</CodeBlock>

      {/* Compatibility */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Compatibility</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The Python SDK auto-patches these libraries:
      </p>
      <ul className="space-y-2 mb-4">
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#10003;</span>
          <span><InlineCode>anthropic</InlineCode> — Anthropic Python SDK</span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#10003;</span>
          <span><InlineCode>openai</InlineCode> — OpenAI Python SDK</span>
        </li>
      </ul>
      <p className="text-gray-400 leading-relaxed mb-4">
        For frameworks like LangChain, CrewAI, and LlamaIndex, see the{" "}
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
