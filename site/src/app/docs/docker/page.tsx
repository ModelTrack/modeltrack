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

export default function DockerPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">Docker &amp; Deployment</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        Run ModelTrack locally with Docker Compose, or deploy to production
        with individual containers.
      </p>

      {/* Docker Compose */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Docker Compose (local development)</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        The fastest way to get started. This runs all four services locally:
      </p>
      <CodeBlock filename="terminal">{`git clone https://github.com/ModelTrack/modeltrack.git
cd modeltrack
docker compose up`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        This starts:
      </p>
      <ul className="space-y-2 mb-4 ml-1">
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">Proxy</strong> (Go) on port <InlineCode>8080</InlineCode> — handles all LLM requests</span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">API</strong> (Node.js) on port <InlineCode>3001</InlineCode> — serves dashboard data</span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">Collector</strong> — aggregates infrastructure metrics</span>
        </li>
        <li className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-emerald-400">&#8594;</span>
          <span><strong className="text-white">Dashboard</strong> on port <InlineCode>5173</InlineCode> — web UI</span>
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">The docker-compose.yml</h3>
      <CodeBlock filename="docker-compose.yml">{`services:
  proxy:
    build: ./proxy
    ports:
      - "8080:8080"
    environment:
      - PROXY_PORT=8080
      - ANTHROPIC_BASE_URL=https://api.anthropic.com
      - DATA_DIR=/data
      - LOG_LEVEL=info
    volumes:
      - ./data:/data

  api:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DATA_DIR=/data
      - DB_PATH=/data/modeltrack.db
    volumes:
      - ./data:/data
    depends_on:
      - proxy

  collector:
    build: ./collector
    environment:
      - DATA_DIR=/data
      - ENABLE_AWS_COSTS=false
      - ENABLE_OPENCOST=false
      - ENABLE_GPU_METRICS=false
    volumes:
      - ./data:/data
    depends_on:
      - api

  dashboard:
    build: ./dashboard
    ports:
      - "5173:4173"
    depends_on:
      - api`}</CodeBlock>

      {/* Individual Docker images */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Individual Docker images</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Each service has its own Dockerfile. Build and run them individually:
      </p>
      <CodeBlock filename="terminal">{`# Build individual images
docker build -t modeltrack-proxy ./proxy
docker build -t modeltrack-api ./api
docker build -t modeltrack-collector ./collector
docker build -t modeltrack-dashboard ./dashboard

# Run the proxy standalone
docker run -d \\
  -p 8080:8080 \\
  -v $(pwd)/data:/data \\
  -e PROXY_PORT=8080 \\
  -e ANTHROPIC_BASE_URL=https://api.anthropic.com \\
  -e DATA_DIR=/data \\
  modeltrack-proxy`}</CodeBlock>

      {/* Environment variables */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Environment variables reference</h2>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">Proxy</h3>
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
              <td className="py-3 px-4">Proxy listen port</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>ANTHROPIC_BASE_URL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>https://api.anthropic.com</InlineCode></td>
              <td className="py-3 px-4">Upstream Anthropic API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>OPENAI_BASE_URL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>https://api.openai.com</InlineCode></td>
              <td className="py-3 px-4">Upstream OpenAI API</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DATA_DIR</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>../data</InlineCode></td>
              <td className="py-3 px-4">Directory for cost events and config files</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>LOG_LEVEL</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>info</InlineCode></td>
              <td className="py-3 px-4">Logging verbosity</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>CACHE_ENABLED</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>true</InlineCode></td>
              <td className="py-3 px-4">Enable response caching</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>CACHE_TTL_SECONDS</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>3600</InlineCode></td>
              <td className="py-3 px-4">Cache entry time-to-live</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">API</h3>
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
              <td className="py-3 px-4">API listen port</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DATA_DIR</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>/data</InlineCode></td>
              <td className="py-3 px-4">Directory for cost events and config files</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>DB_PATH</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>/data/modeltrack.db</InlineCode></td>
              <td className="py-3 px-4">SQLite database path</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>SLACK_WEBHOOK_URL</InlineCode></td>
              <td className="py-3 px-4">-</td>
              <td className="py-3 px-4">Slack webhook for alerts and reports</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-white mt-8 mb-4">Collector</h3>
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
              <td className="py-3 px-4"><InlineCode>DATA_DIR</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>/data</InlineCode></td>
              <td className="py-3 px-4">Directory for cost events</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>ENABLE_AWS_COSTS</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>false</InlineCode></td>
              <td className="py-3 px-4">Enable AWS Cost Explorer integration</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>ENABLE_OPENCOST</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>false</InlineCode></td>
              <td className="py-3 px-4">Enable OpenCost integration</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4"><InlineCode>ENABLE_GPU_METRICS</InlineCode></td>
              <td className="py-3 px-4"><InlineCode>false</InlineCode></td>
              <td className="py-3 px-4">Enable GPU metrics collection</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Production considerations */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Running in production</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        When deploying ModelTrack to production, consider the following:
      </p>
      <ul className="space-y-3 mb-4 ml-1">
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Persistence:</strong> The{" "}
          <InlineCode>data/</InlineCode> directory contains cost events (JSONL),
          the SQLite database, and config files (budgets, routing rules). Mount
          this to a persistent volume.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Networking:</strong> The proxy should be
          accessible from your application pods but <em>not</em> from the public
          internet. Deploy it within your VPC or internal network.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Scaling:</strong> The proxy is stateless
          (except for the in-memory cache). You can run multiple proxy instances
          behind a load balancer. The API service writes to SQLite, so run a
          single API instance or switch to PostgreSQL for multi-instance setups.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Health checks:</strong> The proxy
          exposes <InlineCode>GET /healthz</InlineCode> for liveness probes.
        </li>
      </ul>

      {/* Kubernetes */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Kubernetes</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Here is a minimal Kubernetes deployment for the proxy. Adapt as needed
        for your cluster.
      </p>
      <CodeBlock filename="modeltrack-proxy.yaml">{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: modeltrack-proxy
  labels:
    app: modeltrack-proxy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: modeltrack-proxy
  template:
    metadata:
      labels:
        app: modeltrack-proxy
    spec:
      containers:
        - name: proxy
          image: modeltrack-proxy:latest
          ports:
            - containerPort: 8080
          env:
            - name: PROXY_PORT
              value: "8080"
            - name: ANTHROPIC_BASE_URL
              value: "https://api.anthropic.com"
            - name: DATA_DIR
              value: "/data"
            - name: CACHE_ENABLED
              value: "true"
          volumeMounts:
            - name: data
              mountPath: /data
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: modeltrack-data
---
apiVersion: v1
kind: Service
metadata:
  name: modeltrack-proxy
spec:
  selector:
    app: modeltrack-proxy
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP`}</CodeBlock>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-yellow-400">Note:</strong> A full Helm chart
          is planned for a future release. For now, use these manifests as a
          starting point and customize for your environment.
        </p>
      </div>
    </>
  );
}
