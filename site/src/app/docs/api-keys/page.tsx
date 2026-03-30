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

export default function ApiKeysPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">API Keys &amp; Security</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        The number one question we get: &quot;Does ModelTrack see my API keys?&quot;
        Here&apos;s the full answer.
      </p>

      {/* The short answer */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Yes, the proxy sees your API keys</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        ModelTrack is a reverse proxy. It forwards your LLM requests to the
        upstream provider (Anthropic, OpenAI, etc.). To do that, it needs to
        read the authorization header — which contains your API key.
      </p>
      <p className="text-gray-400 leading-relaxed mb-4">
        This is the same as any reverse proxy: nginx, Envoy, Traefik, AWS ALB.
        If you already use a reverse proxy or API gateway, your API keys pass
        through it too.
      </p>

      {/* What the proxy does with keys */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">What the proxy does (and does not) do with keys</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
          <span className="text-emerald-400 text-lg flex-shrink-0 mt-0.5">&#10003;</span>
          <div>
            <p className="text-sm text-white font-medium">Forwards the key to the upstream provider</p>
            <p className="text-sm text-gray-400 mt-1">The proxy reads the Authorization header, forwards the request (with the key) to the real API, and returns the response.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">&#10007;</span>
          <div>
            <p className="text-sm text-white font-medium">Never stores API keys</p>
            <p className="text-sm text-gray-400 mt-1">Keys exist only in memory during the request lifecycle. They are never written to disk, logged, or persisted in any database.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">&#10007;</span>
          <div>
            <p className="text-sm text-white font-medium">Never logs API keys</p>
            <p className="text-sm text-gray-400 mt-1">The cost event logs contain model, tokens, cost, headers, and timing — but never the Authorization header or API key.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">&#10007;</span>
          <div>
            <p className="text-sm text-white font-medium">Never sends keys to third parties</p>
            <p className="text-sm text-gray-400 mt-1">ModelTrack is fully self-hosted. There is no telemetry, no phone-home, no external service that receives your data.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">&#10007;</span>
          <div>
            <p className="text-sm text-white font-medium">Never modifies the API key</p>
            <p className="text-sm text-gray-400 mt-1">The proxy adds X-ModelTrack-* headers for attribution but never changes the Authorization header or any other auth-related data.</p>
          </div>
        </div>
      </div>

      {/* Self-hosted advantage */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Self-hosted: keys never leave your infrastructure</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        ModelTrack runs entirely within your infrastructure. Unlike SaaS
        observability tools that require you to send data to an external
        service, ModelTrack processes everything locally:
      </p>
      <CodeBlock>{`Your App  →  ModelTrack Proxy (your VPC)  →  Anthropic/OpenAI API
                     ↓
              Cost events (your disk)
                     ↓
              Dashboard (your browser)`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Your API keys travel from your app to the proxy (within your network)
        and from the proxy to the LLM provider (over HTTPS). They never touch
        any ModelTrack-hosted service because there is no ModelTrack-hosted service.
      </p>

      {/* Recommendations */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Security recommendations</h2>
      <ul className="space-y-4 mb-6 ml-1">
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Deploy within your VPC or internal network.</strong>{" "}
          The proxy should be accessible from your application services but not
          from the public internet. Use a <InlineCode>ClusterIP</InlineCode>{" "}
          service in Kubernetes, or a private subnet in AWS/GCP.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Use TLS between your app and the proxy.</strong>{" "}
          If the proxy is on a different host than your app, terminate TLS at
          the proxy or use a service mesh.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Rotate API keys regularly.</strong>{" "}
          ModelTrack doesn&apos;t store keys, so rotation has zero impact on the
          proxy — your new key will be forwarded automatically.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Restrict access to the data directory.</strong>{" "}
          The <InlineCode>data/</InlineCode> directory contains cost event logs
          and the SQLite database. These include request metadata (model, tokens,
          team, feature) but never API keys or request/response bodies.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Audit the code yourself.</strong>{" "}
          ModelTrack is open source. The proxy is a single Go binary with no
          external dependencies beyond the standard library. You can read the
          entire codebase in an afternoon.
        </li>
      </ul>

      {/* What's in the logs */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">What gets logged</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Here is an example of a cost event that the proxy writes to{" "}
        <InlineCode>data/events.jsonl</InlineCode>:
      </p>
      <CodeBlock filename="data/events.jsonl (one line, formatted for readability)">{`{
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
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Notice what is <strong className="text-white">not</strong> in the log:
        no API key, no Authorization header, no request body, no response body.
        Only metadata needed for cost tracking and attribution.
      </p>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          For a full overview of our security architecture, data handling, and
          infrastructure, see the{" "}
          <Link
            href="/security"
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            Security page
          </Link>.
        </p>
      </div>

      {/* Comparison */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">How this compares</h2>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Approach</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Sees API key?</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Data leaves your infra?</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4 text-white">ModelTrack (self-hosted proxy)</td>
              <td className="py-3 px-4">In memory only</td>
              <td className="py-3 px-4">No</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">SaaS LLM observability tools</td>
              <td className="py-3 px-4">Often yes</td>
              <td className="py-3 px-4">Yes (sent to their servers)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">nginx / Envoy reverse proxy</td>
              <td className="py-3 px-4">In memory only</td>
              <td className="py-3 px-4">No</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">Cloud provider API gateway</td>
              <td className="py-3 px-4">In memory only</td>
              <td className="py-3 px-4">Stays in cloud provider</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
