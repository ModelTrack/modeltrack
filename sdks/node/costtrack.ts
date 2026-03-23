/**
 * CostTrack Node SDK - Auto-instrument LLM calls.
 *
 * Usage:
 *   import 'costtrack'  // Add this one line
 *
 * Or with configuration:
 *   import { configure, withSession } from './costtrack'
 *   configure({ team: 'my-team', app: 'my-app' })
 *
 * Configure via environment variables:
 *   COSTTRACK_PROXY_URL=http://localhost:8080
 *   COSTTRACK_TEAM=my-team
 *   COSTTRACK_APP=my-app
 *   COSTTRACK_FEATURE=my-feature
 *   COSTTRACK_CUSTOMER_TIER=enterprise
 *   COSTTRACK_SESSION_ID=session-123  (optional)
 *   COSTTRACK_TRACE_ID=trace-456  (optional)
 *   COSTTRACK_PROMPT_TEMPLATE=template-id  (optional)
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface CostTrackConfig {
  proxyUrl: string;
  team: string;
  app: string;
  feature: string;
  customerTier: string;
  sessionId: string;
  traceId: string;
  promptTemplate: string;
}

const config: CostTrackConfig = {
  proxyUrl: process.env.COSTTRACK_PROXY_URL || "http://localhost:8080",
  team: process.env.COSTTRACK_TEAM || "",
  app: process.env.COSTTRACK_APP || "",
  feature: process.env.COSTTRACK_FEATURE || "",
  customerTier: process.env.COSTTRACK_CUSTOMER_TIER || "",
  sessionId: process.env.COSTTRACK_SESSION_ID || "",
  traceId: process.env.COSTTRACK_TRACE_ID || "",
  promptTemplate: process.env.COSTTRACK_PROMPT_TEMPLATE || "",
};

// Session ID and trace ID overrides for withSession().
let _activeSessionId: string | null = null;
let _activeTraceId: string | null = null;

export function configure(opts: Partial<Omit<CostTrackConfig, "proxyUrl"> & { proxyUrl: string }>): void {
  if (opts.proxyUrl) config.proxyUrl = opts.proxyUrl;
  if (opts.team) config.team = opts.team;
  if (opts.app) config.app = opts.app;
  if (opts.feature) config.feature = opts.feature;
  if (opts.customerTier) config.customerTier = opts.customerTier;
  if (opts.sessionId) config.sessionId = opts.sessionId;
  if (opts.traceId) config.traceId = opts.traceId;
  if (opts.promptTemplate) config.promptTemplate = opts.promptTemplate;

  // Re-patch so new clients pick up changes.
  patchAll();
}

/**
 * Run a function with a specific session ID attached to all LLM calls.
 *
 * Usage:
 *   await withSession("user-query-123", async () => {
 *     const response = await client.messages.create({ ... });
 *   });
 *
 *   await withSession("session-123", async () => { ... }, { traceId: "trace-456" });
 */
export async function withSession<T>(
  sessionId: string,
  fn: () => T | Promise<T>,
  opts?: { traceId?: string },
): Promise<T> {
  const previousSession = _activeSessionId;
  const previousTrace = _activeTraceId;
  _activeSessionId = sessionId;
  if (opts?.traceId) {
    _activeTraceId = opts.traceId;
  }
  try {
    return await fn();
  } finally {
    _activeSessionId = previousSession;
    _activeTraceId = previousTrace;
  }
}

// ---------------------------------------------------------------------------
// Header building
// ---------------------------------------------------------------------------

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.team) headers["X-CostTrack-Team"] = config.team;
  if (config.app) headers["X-CostTrack-App"] = config.app;
  if (config.feature) headers["X-CostTrack-Feature"] = config.feature;
  if (config.customerTier) headers["X-CostTrack-Customer-Tier"] = config.customerTier;
  if (config.promptTemplate) headers["X-CostTrack-Prompt-Template"] = config.promptTemplate;

  // Active session from withSession() overrides config.
  const sessionId = _activeSessionId || config.sessionId;
  if (sessionId) headers["X-CostTrack-Session-ID"] = sessionId;

  // Active trace ID from withSession() overrides config.
  const traceId = _activeTraceId || config.traceId;
  if (traceId) headers["X-CostTrack-Trace-ID"] = traceId;

  return headers;
}

// ---------------------------------------------------------------------------
// Anthropic patching
// ---------------------------------------------------------------------------

let _anthropicOriginalConstructor: (new (...args: any[]) => any) | null = null;

function patchAnthropic(): void {
  let anthropicModule: any;
  try {
    anthropicModule = require("@anthropic-ai/sdk");
  } catch {
    // Package not installed.
    return;
  }

  const OriginalAnthropic = _anthropicOriginalConstructor || anthropicModule.default?.Anthropic || anthropicModule.Anthropic;
  if (!OriginalAnthropic) return;

  if (!_anthropicOriginalConstructor) {
    _anthropicOriginalConstructor = OriginalAnthropic;
  }

  function PatchedAnthropic(this: any, opts: any = {}) {
    // Set baseURL to proxy unless the caller explicitly provided one.
    if (!opts.baseURL) {
      opts.baseURL = config.proxyUrl.replace(/\/+$/, "") + "/";
    }

    // Merge CostTrack headers into defaultHeaders.
    const costtrackHeaders = buildHeaders();
    opts.defaultHeaders = { ...costtrackHeaders, ...(opts.defaultHeaders || {}) };

    return new (_anthropicOriginalConstructor as any)(opts);
  }

  // Copy static properties and prototype.
  Object.setPrototypeOf(PatchedAnthropic, OriginalAnthropic);
  PatchedAnthropic.prototype = OriginalAnthropic.prototype;

  // Replace on the module.
  if (anthropicModule.default?.Anthropic) {
    anthropicModule.default.Anthropic = PatchedAnthropic;
  }
  if (anthropicModule.Anthropic) {
    anthropicModule.Anthropic = PatchedAnthropic;
  }

  console.log("CostTrack: patched @anthropic-ai/sdk");
}

// ---------------------------------------------------------------------------
// OpenAI patching
// ---------------------------------------------------------------------------

let _openaiOriginalConstructor: (new (...args: any[]) => any) | null = null;

function patchOpenAI(): void {
  let openaiModule: any;
  try {
    openaiModule = require("openai");
  } catch {
    // Package not installed.
    return;
  }

  const OriginalOpenAI = _openaiOriginalConstructor || openaiModule.default?.OpenAI || openaiModule.OpenAI;
  if (!OriginalOpenAI) return;

  if (!_openaiOriginalConstructor) {
    _openaiOriginalConstructor = OriginalOpenAI;
  }

  function PatchedOpenAI(this: any, opts: any = {}) {
    // Set baseURL to proxy unless the caller explicitly provided one.
    if (!opts.baseURL) {
      opts.baseURL = config.proxyUrl.replace(/\/+$/, "") + "/";
    }

    // Merge CostTrack headers into defaultHeaders.
    const costtrackHeaders = buildHeaders();
    opts.defaultHeaders = { ...costtrackHeaders, ...(opts.defaultHeaders || {}) };

    return new (_openaiOriginalConstructor as any)(opts);
  }

  // Copy static properties and prototype.
  Object.setPrototypeOf(PatchedOpenAI, OriginalOpenAI);
  PatchedOpenAI.prototype = OriginalOpenAI.prototype;

  // Replace on the module.
  if (openaiModule.default?.OpenAI) {
    openaiModule.default.OpenAI = PatchedOpenAI;
  }
  if (openaiModule.OpenAI) {
    openaiModule.OpenAI = PatchedOpenAI;
  }

  console.log("CostTrack: patched openai");
}

// ---------------------------------------------------------------------------
// Auto-patch on import
// ---------------------------------------------------------------------------

function patchAll(): void {
  for (const patcher of [patchAnthropic, patchOpenAI]) {
    try {
      patcher();
    } catch (err) {
      console.warn("CostTrack: failed to patch:", err);
    }
  }
}

// Run automatically on import.
patchAll();
