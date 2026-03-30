import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security | ModelTrack",
  description:
    "How ModelTrack protects your data and API keys. Learn about our security architecture, data handling, and infrastructure.",
};

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

function SectionCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center justify-center size-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold flex-shrink-0">
          {number}
        </span>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0 text-lg font-bold">
            <span className="text-emerald-400">Model</span>
            <span className="text-white">Track</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">Features</Link>
            <Link href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">Pricing</Link>
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">Docs</Link>
            <Link href="/status" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">Status</Link>
            <Link href="https://github.com/ModelTrack/modeltrack" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">GitHub</Link>
          </div>
          <Link
            href="https://app.modeltrack.ai/signup"
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-black hover:bg-emerald-400 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 pt-16">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 mb-6">
              <svg className="size-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Security at ModelTrack</h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
              How we protect your data and API keys. ModelTrack is designed so that
              sensitive information never persists — your keys pass through, your
              prompts stay private, and only cost metadata is stored.
            </p>
          </div>

          {/* Section 1: API Key Handling */}
          <SectionCard number="1" title="API Key Handling">
            <p className="text-gray-400 leading-relaxed mb-4">
              Your LLM API keys are passed through to providers in real-time.
              The proxy reads the Authorization header, forwards the request,
              and returns the response. That&apos;s it.
            </p>
            <ul className="space-y-3 mb-6 ml-1">
              {[
                "Keys are NEVER stored, logged, or persisted",
                "Keys exist only in memory during the request (typically < 1 second)",
                "Keys are never sent to any ModelTrack service or third party",
                "The proxy never modifies your Authorization header",
              ].map((item) => (
                <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm font-semibold text-white mb-2">Data flow</p>
            <CodeBlock>{`Your App
  │
  │  Request + API key (Authorization header)
  ▼
ModelTrack Proxy (in-memory only, < 1 second)
  │
  │  Forwards request + API key to provider
  ▼
LLM Provider (Anthropic, OpenAI, etc.)
  │
  │  Response
  ▼
ModelTrack Proxy
  │
  ├──▶ Cost event (model, tokens, cost, latency) → Database
  │    (NO key, NO prompt, NO response content)
  │
  │  Response (unmodified)
  ▼
Your App`}</CodeBlock>
          </SectionCard>

          {/* Section 2: What We Track */}
          <SectionCard number="2" title="What We Track">
            <p className="text-gray-400 leading-relaxed mb-4">
              ModelTrack records only the metadata needed for cost tracking and attribution.
              Here is exactly what is and is not included in a cost event.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                <p className="text-sm font-semibold text-emerald-400 mb-3">What IS tracked</p>
                <ul className="space-y-2">
                  {[
                    "Model name",
                    "Input & output tokens",
                    "Cost (USD)",
                    "Latency (ms)",
                    "Provider",
                    "Team / App / Feature headers",
                    "Timestamp",
                    "Cache hit status",
                    "Request ID",
                  ].map((item) => (
                    <li key={item} className="text-gray-400 text-sm flex items-center gap-2">
                      <span className="text-emerald-400 flex-shrink-0">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
                <p className="text-sm font-semibold text-red-400 mb-3">What is NOT tracked</p>
                <ul className="space-y-2">
                  {[
                    "Prompt content",
                    "Response content",
                    "API keys",
                    "Authorization headers",
                    "Request/response bodies",
                  ].map((item) => (
                    <li key={item} className="text-gray-400 text-sm flex items-center gap-2">
                      <span className="text-red-400 flex-shrink-0">&#10007;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm font-semibold text-white mb-2">Example cost event</p>
            <CodeBlock filename="cost event (JSON)">{`{
  "timestamp": "2026-03-26T10:30:00Z",
  "request_id": "req_abc123",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "input_tokens": 150,
  "output_tokens": 320,
  "cost_usd": 0.00234,
  "latency_ms": 1200,
  "team": "ml-research",
  "app": "chatbot",
  "feature": "customer-support",
  "session_id": "user-query-123",
  "cache_hit": false,
  "routed": false
}`}</CodeBlock>
          </SectionCard>

          {/* Section 3: Infrastructure */}
          <SectionCard number="3" title="Infrastructure">
            <p className="text-gray-400 leading-relaxed mb-4">
              Our hosted service runs on Google Cloud with security best practices:
            </p>
            <ul className="space-y-3 mb-4 ml-1">
              {[
                {
                  title: "Google Cloud Run",
                  desc: "Serverless, auto-scaling containers. No persistent disk — the proxy is completely stateless.",
                },
                {
                  title: "Google Firestore",
                  desc: "Cost events and account data are stored in Firestore with encryption at rest (AES-256).",
                },
                {
                  title: "SSL/TLS everywhere",
                  desc: "All connections — from your app to the proxy, and from the proxy to LLM providers — use TLS encryption.",
                },
                {
                  title: "Stateless proxy",
                  desc: "The proxy holds nothing in persistent storage. Each request is independent. There is no disk, no local database, no file system state.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <span className="text-emerald-400 text-lg flex-shrink-0 mt-0.5">&#10003;</span>
                  <div>
                    <p className="text-sm text-white font-medium">{item.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Section 4: Self-Hosted Option */}
          <SectionCard number="4" title="Self-Hosted Option">
            <p className="text-gray-400 leading-relaxed mb-4">
              ModelTrack is open source. If you need maximum control over your data,
              run the entire stack in your own infrastructure.
            </p>
            <ul className="space-y-2 mb-6 ml-1">
              {[
                "Deploy the proxy, API, and dashboard in your own VPC",
                "Your data never leaves your infrastructure",
                "Full control over networking, access, and encryption",
                "Same features as the hosted version",
              ].map((item) => (
                <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                Get started with self-hosting:{" "}
                <Link
                  href="https://github.com/ModelTrack/modeltrack"
                  className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                >
                  github.com/ModelTrack/modeltrack
                </Link>
              </p>
            </div>
          </SectionCard>

          {/* Section 5: Reporting Issues */}
          <SectionCard number="5" title="Reporting Issues">
            <p className="text-gray-400 leading-relaxed mb-4">
              We take security seriously. If you discover a vulnerability or security
              concern, please let us know.
            </p>
            <ul className="space-y-2 mb-6 ml-1">
              {[
                <>Email: <a href="mailto:security@modeltrack.ai" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">security@modeltrack.ai</a></>,
                "Responsible disclosure is welcome and appreciated",
                "We will acknowledge receipt within 48 hours",
                "We will not take legal action against good-faith security researchers",
              ].map((item, i) => (
                <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-gray-400 leading-relaxed">
              For general support questions, reach out to{" "}
              <a
                href="mailto:support@modeltrack.ai"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                support@modeltrack.ai
              </a>.
            </p>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
