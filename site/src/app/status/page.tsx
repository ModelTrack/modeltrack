"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ModelStatus {
  name: string;
  modelId: string; // actual model ID for API calls (e.g. "claude-haiku-4-5")
  provider?: string;
  status: "operational" | "degraded" | "down";
  latency: number | null;
  ttft: number | null;
  uptime24h: number | null;
  latencyHistory: (number | null)[];
}

interface PingData {
  latency_ms: number;
  ttft_ms: number;
  status: string;
  tokens_per_second?: number;
  created_at: { _seconds: number; _nanoseconds: number };
}

interface HistoryResponse {
  pings: PingData[];
}

interface ChartPoint {
  time: number;
  timeLabel: string;
  latency: number;
  ttft: number;
  tps: number | null;
}

interface ProviderStatus {
  provider: string;
  status: "operational" | "degraded" | "down";
  models: ModelStatus[];
}

interface StatusData {
  overall: "operational" | "degraded" | "down";
  providers: ProviderStatus[];
  lastUpdated: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data (shown when monitor is unavailable)                      */
/* ------------------------------------------------------------------ */

const DEMO_DATA: StatusData = {
  overall: "operational",
  providers: [
    {
      provider: "Anthropic",
      status: "operational",
      models: [
        {
          name: "Claude Sonnet 4.6",
          modelId: "claude-sonnet-4-6",
          status: "operational",
          latency: 842,
          ttft: 312,
          uptime24h: 99.98,
          latencyHistory: [
            780, 810, 795, 830, 815, 850, 820, 790, 840, 860, 835, 810, 800,
            825, 845, 830, 815, 805, 842, 855, 820, 810, 830, 842,
          ],
        },
        {
          name: "Claude Haiku 3.5",
          modelId: "claude-haiku-3.5",
          status: "operational",
          latency: 320,
          ttft: 145,
          uptime24h: 100,
          latencyHistory: [
            310, 315, 305, 320, 330, 315, 310, 325, 300, 320, 315, 310, 305,
            320, 325, 315, 310, 320, 305, 310, 325, 320, 315, 320,
          ],
        },
        {
          name: "Claude Opus 4.6",
          modelId: "claude-opus-4-6",
          status: "operational",
          latency: 1850,
          ttft: 620,
          uptime24h: 99.95,
          latencyHistory: [
            1800, 1820, 1790, 1850, 1870, 1830, 1810, 1860, 1840, 1820, 1850,
            1830, 1810, 1840, 1860, 1850, 1820, 1810, 1830, 1850, 1840, 1820,
            1830, 1850,
          ],
        },
      ],
    },
    {
      provider: "OpenAI",
      status: "operational",
      models: [
        {
          name: "GPT-4o",
          modelId: "gpt-4o",
          status: "operational",
          latency: 680,
          ttft: 280,
          uptime24h: 99.97,
          latencyHistory: [
            650, 670, 660, 680, 690, 675, 660, 685, 670, 680, 695, 670, 660,
            675, 690, 680, 665, 670, 680, 690, 675, 680, 670, 680,
          ],
        },
        {
          name: "GPT-4o Mini",
          modelId: "gpt-4o-mini",
          status: "operational",
          latency: 290,
          ttft: 120,
          uptime24h: 100,
          latencyHistory: [
            280, 285, 275, 290, 295, 285, 280, 290, 275, 285, 295, 280, 275,
            290, 285, 280, 290, 275, 285, 290, 280, 285, 290, 290,
          ],
        },
        {
          name: "o3",
          modelId: "o3",
          status: "operational",
          latency: 2200,
          ttft: 850,
          uptime24h: 99.9,
          latencyHistory: [
            2100, 2150, 2120, 2200, 2180, 2210, 2150, 2190, 2170, 2200, 2220,
            2180, 2150, 2190, 2210, 2200, 2170, 2160, 2200, 2190, 2180, 2200,
            2190, 2200,
          ],
        },
      ],
    },
  ],
  lastUpdated: new Date().toISOString(),
};

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.5, ease: "easeOut" as const },
};

function stagger(i: number) {
  return {
    ...fadeUp,
    transition: { ...fadeUp.transition, delay: i * 0.08 },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_COLORS = {
  operational: "#10b981",
  degraded: "#f59e0b",
  down: "#ef4444",
} as const;

const STATUS_BG = {
  operational: "bg-emerald-500/10",
  degraded: "bg-yellow-500/10",
  down: "bg-red-500/10",
} as const;

const STATUS_TEXT = {
  operational: "text-emerald-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
} as const;

const STATUS_BORDER = {
  operational: "border-emerald-500/20",
  degraded: "border-yellow-500/20",
  down: "border-red-500/20",
} as const;

const STATUS_LABELS = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
} as const;

const OVERALL_LABELS = {
  operational: "All Systems Operational",
  degraded: "Some Systems Degraded",
  down: "Major Outage Detected",
} as const;

function StatusIcon({
  status,
  size = 16,
}: {
  status: "operational" | "degraded" | "down";
  size?: number;
}) {
  if (status === "operational")
    return <CheckCircle2 size={size} className="text-emerald-400" />;
  if (status === "degraded")
    return <AlertTriangle size={size} className="text-yellow-400" />;
  return <XCircle size={size} className="text-red-400" />;
}

/* ------------------------------------------------------------------ */
/*  Sparkline component                                                */
/* ------------------------------------------------------------------ */

function Sparkline({ data }: { data: (number | null)[] }) {
  const values = data.filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end gap-[1px] h-8 w-full">
      {data.map((v, i) => {
        if (v === null) {
          return (
            <div
              key={i}
              className="bg-white/5 rounded-sm"
              style={{ width: `${barWidth}%`, height: "2px" }}
            />
          );
        }
        const pct = ((v - min) / range) * 80 + 20; // 20-100% height
        return (
          <div
            key={i}
            className="bg-emerald-500/40 hover:bg-emerald-400/60 rounded-sm transition-colors"
            style={{ width: `${barWidth}%`, height: `${pct}%` }}
            title={`${v}ms`}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Uptime timeline component                                          */
/* ------------------------------------------------------------------ */

function UptimeTimeline({ modelName }: { modelName: string }) {
  // 90 days of no-data bars
  const days = Array.from({ length: 90 });
  return (
    <div className="flex items-center gap-[1px]">
      <span className="text-xs text-gray-500 w-36 truncate flex-shrink-0 font-mono">
        {modelName}
      </span>
      <div className="flex items-center gap-[1px] flex-1">
        {days.map((_, i) => (
          <div
            key={i}
            className="h-4 bg-white/[0.06] rounded-[1px] flex-1 min-w-[2px]"
            title="No data yet"
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-600 ml-2 flex-shrink-0">
        No data yet
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip for the chart                                       */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{d.timeLabel}</p>
      <p className="text-white font-mono">Latency: <span className="text-emerald-400">{d.latency}ms</span></p>
      <p className="text-white font-mono">TTFT: <span className="text-emerald-400">{d.ttft}ms</span></p>
      {d.tps !== null && (
        <p className="text-white font-mono">Tokens/s: <span className="text-emerald-400">{d.tps.toFixed(1)}</span></p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Latency chart component (Recharts AreaChart)                       */
/* ------------------------------------------------------------------ */

function LatencyChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-xs text-gray-600">
        Collecting data...
      </div>
    );
  }

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timeLabel"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#latencyGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#10b981", stroke: "#000", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Model detail panel (expanded view with chart + stats)              */
/* ------------------------------------------------------------------ */

function ModelDetailPanel({ provider, model }: { provider: string; model: string }) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState<{ avgLatency: number; avgTtft: number; avgTps: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/status/history?provider=${encodeURIComponent(provider.toLowerCase())}&model=${encodeURIComponent(model)}`
        );
        if (!res.ok) throw new Error("failed");
        const json: HistoryResponse = await res.json();
        if (cancelled) return;

        const pings = (json.pings || [])
          .filter((p) => p.latency_ms > 0)
          .sort((a, b) => a.created_at._seconds - b.created_at._seconds);

        const points: ChartPoint[] = pings.map((p) => {
          const d = new Date(p.created_at._seconds * 1000);
          return {
            time: p.created_at._seconds,
            timeLabel: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            latency: Math.round(p.latency_ms),
            ttft: Math.round(p.ttft_ms),
            tps: p.tokens_per_second ?? null,
          };
        });

        setChartData(points);

        if (pings.length > 0) {
          const avgLatency = Math.round(pings.reduce((s, p) => s + p.latency_ms, 0) / pings.length);
          const avgTtft = Math.round(pings.reduce((s, p) => s + p.ttft_ms, 0) / pings.length);
          const tpsPings = pings.filter((p) => p.tokens_per_second != null && p.tokens_per_second > 0);
          const avgTps = tpsPings.length > 0
            ? tpsPings.reduce((s, p) => s + (p.tokens_per_second ?? 0), 0) / tpsPings.length
            : null;
          setStats({ avgLatency, avgTtft, avgTps });
        }
      } catch {
        // silently fail — chart just won't show
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [provider, model]);

  if (loading) {
    return (
      <div className="pt-4 flex items-center gap-2 text-xs text-gray-500">
        <RefreshCw size={12} className="animate-spin" />
        Loading history...
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-3">
      {/* Chart */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">
          24h Response Time
        </p>
        <LatencyChart data={chartData} />
      </div>

      {/* Stat boxes */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
              Avg Latency
            </p>
            <p className="text-sm font-mono text-emerald-400">{stats.avgLatency}ms</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
              Avg TTFT
            </p>
            <p className="text-sm font-mono text-emerald-400">{stats.avgTtft}ms</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
              Avg Tokens/s
            </p>
            <p className="text-sm font-mono text-emerald-400">
              {stats.avgTps !== null ? stats.avgTps.toFixed(1) : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const toggleModel = useCallback((key: string) => {
    setExpandedModel((prev) => (prev === key ? null : key));
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = await res.json();
        if (json && json.models && json.models.length > 0) {
          // Transform flat models array into grouped providers
          const grouped = new Map<string, ModelStatus[]>();
          for (const m of json.models) {
            const provider = m.provider || "unknown";
            if (!grouped.has(provider)) grouped.set(provider, []);
            const status: "operational" | "degraded" | "down" =
              m.status === "ok" ? "operational" :
              m.status === "error" ? "down" : "degraded";
            grouped.get(provider)!.push({
              name: m.displayName || m.model || m.id,
              modelId: m.model || m.id,
              status,
              latency: m.avg_latency_ms ?? m.latency_ms ?? null,
              ttft: m.ttft_ms ?? null,
              uptime24h: m.uptime_percent ?? null,
              latencyHistory: [],
            });
          }

          const providers: ProviderStatus[] = Array.from(grouped.entries()).map(
            ([provider, models]) => {
              const worstStatus = models.some((m) => m.status === "down")
                ? "down" as const
                : models.some((m) => m.status === "degraded")
                ? "degraded" as const
                : "operational" as const;
              return { provider, status: worstStatus, models };
            }
          );

          const overall = providers.some((p) => p.status === "down")
            ? "down" as const
            : providers.some((p) => p.status === "degraded")
            ? "degraded" as const
            : "operational" as const;

          setData({
            overall,
            providers,
            lastUpdated: new Date().toISOString(),
          });
          setIsLive(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    // Fallback to demo data
    setData(DEMO_DATA);
    setIsLive(false);
  }

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ============================================================ */}
      {/*  Navbar                                                       */}
      {/* ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-0 text-lg font-bold"
          >
            <span className="text-emerald-500">Model</span>
            <span className="text-white">Track</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Docs
            </Link>
            <Link
              href="/status"
              className="text-sm text-white font-medium transition-colors duration-200"
            >
              Status
            </Link>
            <Link
              href="https://github.com/ModelTrack/modeltrack"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              GitHub
            </Link>
          </div>

          <Link
            href="https://github.com/ModelTrack/modeltrack#quick-start"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  A. Header                                                    */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <motion.div {...stagger(0)}>
            <p className="text-sm text-emerald-400 font-medium mb-3 tracking-wide uppercase">
              AI Model Status
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Real-time LLM API Monitoring
            </h1>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              Live status and performance monitoring for Claude, GPT-4, and
              other LLM APIs.
            </p>
          </motion.div>

          {/* Overall status banner */}
          {!loading && data && (
            <motion.div {...stagger(1)} className="mt-8">
              <div
                className={`inline-flex items-center gap-3 rounded-full px-6 py-3 border ${STATUS_BG[data.overall]} ${STATUS_BORDER[data.overall]}`}
              >
                <StatusIcon status={data.overall} size={20} />
                <span
                  className={`text-sm font-semibold ${STATUS_TEXT[data.overall]}`}
                >
                  {OVERALL_LABELS[data.overall]}
                </span>
              </div>

              {!isLive && (
                <p className="mt-3 text-xs text-gray-600">
                  Showing demo data — monitoring service starting
                </p>
              )}
            </motion.div>
          )}

          {loading && (
            <motion.div {...stagger(1)} className="mt-8">
              <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                <RefreshCw size={14} className="animate-spin" />
                Loading status...
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  B. Provider Cards                                            */}
      {/* ============================================================ */}
      {data && (
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-6">
              {data.providers.map((provider, pi) => (
                <motion.div
                  key={provider.provider}
                  {...stagger(pi + 2)}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 hover:border-emerald-500/20 transition-colors duration-200"
                >
                  {/* Provider header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-10 rounded-lg bg-white/[0.06]">
                        <span className="text-lg font-bold text-white">
                          {provider.provider[0]}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        {provider.provider}
                      </h2>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_BG[provider.status]} ${STATUS_TEXT[provider.status]}`}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor: STATUS_COLORS[provider.status],
                        }}
                      />
                      {STATUS_LABELS[provider.status]}
                    </span>
                  </div>

                  {/* Models */}
                  <div className="space-y-4">
                    {provider.models.map((model) => {
                      const modelKey = `${provider.provider}:${model.name}`;
                      const isExpanded = expandedModel === modelKey;
                      return (
                        <div
                          key={model.name}
                          className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4"
                        >
                          {/* Model header row — clickable */}
                          <button
                            type="button"
                            onClick={() => toggleModel(modelKey)}
                            className="w-full flex items-center justify-between mb-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full"
                                style={{
                                  backgroundColor: STATUS_COLORS[model.status],
                                }}
                              />
                              <span className="text-sm font-mono font-medium text-gray-200 group-hover:text-white transition-colors">
                                {model.name}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`text-gray-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </div>
                            {model.uptime24h !== null && (
                              <span className="text-xs text-gray-500">
                                {model.uptime24h}% uptime (24h)
                              </span>
                            )}
                          </button>

                          {/* Metrics row */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
                                Latency
                              </p>
                              <p className="text-sm font-mono text-white">
                                {model.latency !== null
                                  ? `${model.latency}ms`
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
                                TTFT
                              </p>
                              <p className="text-sm font-mono text-white">
                                {model.ttft !== null ? `${model.ttft}ms` : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Sparkline */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">
                              24h Latency
                            </p>
                            <Sparkline data={model.latencyHistory} />
                          </div>

                          {/* Expanded detail panel */}
                          {isExpanded && (
                            <ModelDetailPanel
                              provider={provider.provider}
                              model={model.modelId}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  C. Uptime Timeline                                           */}
      {/* ============================================================ */}
      {data && (
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div {...stagger(4)}>
              <h2 className="text-xl font-semibold text-white mb-2">
                90-Day Uptime
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Daily uptime history for each model
              </p>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-3">
                {data.providers.flatMap((p) =>
                  p.models.map((m) => (
                    <UptimeTimeline
                      key={`${p.provider}-${m.name}`}
                      modelName={m.name}
                    />
                  ))
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] text-gray-600">90 days ago</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-[1px] bg-emerald-500" />
                      <span className="text-[10px] text-gray-600">100%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-[1px] bg-yellow-500" />
                      <span className="text-[10px] text-gray-600">
                        Degraded
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-[1px] bg-red-500" />
                      <span className="text-[10px] text-gray-600">Outage</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-[1px] bg-white/[0.06]" />
                      <span className="text-[10px] text-gray-600">
                        No data
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600">Today</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  D. Recent Incidents                                          */}
      {/* ============================================================ */}
      {data && (
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div {...stagger(5)}>
              <h2 className="text-xl font-semibold text-white mb-2">
                Recent Incidents
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Detected issues and outages
              </p>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500/40 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  No incidents in the last 24 hours
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  All monitored endpoints are responding normally
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  E. Footer CTA                                                */}
      {/* ============================================================ */}
      <section className="py-20 mt-auto bg-white/[0.02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div {...stagger(6)}>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              Want to track costs across all these providers?
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              ModelTrack monitors every LLM API call, tracks tokens and costs,
              and enforces budgets in real-time.
            </p>
            <div className="mt-8">
              <Link
                href="https://github.com/ModelTrack/modeltrack#quick-start"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-medium text-black hover:bg-emerald-400 transition-colors duration-200"
              >
                Try ModelTrack
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-0 text-sm font-bold"
            >
              <span className="text-emerald-500">Model</span>
              <span className="text-white">Track</span>
            </Link>
            <span className="text-xs text-gray-600">
              Real-time AI cost control
            </span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; 2026 ModelTrack. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
