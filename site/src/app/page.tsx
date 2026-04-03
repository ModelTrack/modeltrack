"use client";

import { motion } from "framer-motion";
import {
  GitBranch,
  Zap,
  Shield,
  ArrowRight,
  Github,
  Check,
  Sparkles,
  BarChart3,
  Users,
} from "lucide-react";
import Link from "next/link";
import DashboardPreview from "@/components/dashboard-preview";
import ModelsPreview from "@/components/models-preview";
import TeamsPreview from "@/components/teams-preview";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 30, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-100px" } as const,
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const fadeUpImmediate = {
  initial: { opacity: 0, y: 30, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

function stagger(i: number) {
  return {
    ...fadeUp,
    transition: { ...fadeUp.transition, delay: i * 0.08 },
  };
}

function staggerImmediate(i: number) {
  return {
    ...fadeUpImmediate,
    transition: { ...fadeUpImmediate.transition, delay: i * 0.08 },
  };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Status", href: "/status" },
  { label: "GitHub", href: "https://github.com/ModelTrack/modeltrack" },
];

const screenshotFeatures = [
  {
    icon: BarChart3,
    title: "See exactly where your spend goes",
    description:
      "See exactly where your spend goes — broken down by model, provider, and team. Donut charts and sortable tables make it easy to optimize.",
    bullets: [
      "Per-model cost breakdown with donut visualization",
      "Sortable model table with token counts",
      "Identify expensive models at a glance",
    ],
    preview: "models" as const,
    layout: "text-left" as const,
  },
  {
    icon: Users,
    title: "Cost intelligence per feature and team",
    description:
      "Attribute AI costs to specific teams and features. Know exactly who is spending what and enforce budgets at the team level.",
    bullets: [
      "Per-team spend with bar chart visualization",
      "Feature-level cost attribution",
      "Budget enforcement per team",
    ],
    preview: "teams" as const,
    layout: "text-right" as const,
  },
];

const smallFeatures = [
  {
    icon: Zap,
    title: "Response Caching",
    description:
      "Cache identical requests to eliminate duplicate API calls. 20-50% cost reduction with zero latency overhead.",
    soon: true,
  },
  {
    icon: GitBranch,
    title: "Smart Routing",
    description:
      "Automatically route to cheaper models when teams approach budget limits. Save 30-70% without changing code.",
    soon: true,
  },
  {
    icon: Shield,
    title: "Budget Enforcement",
    description:
      "Set per-team and per-app budgets with hard limits. Block or warn before overspending — at the proxy level.",
    soon: true,
  },
];

const providers = [
  { name: "Anthropic", soon: false },
  { name: "OpenAI", soon: false },
  { name: "AWS Bedrock", soon: false },
  { name: "Azure OpenAI", soon: false },
  { name: "Google Vertex", soon: true },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "Up to $1K/month AI spend tracked",
      "1 team, 2 providers",
      "7-day data retention",
      "Community support",
    ],
    cta: "Get Started",
    ctaStyle: "outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    features: [
      "Up to $50K/month AI spend tracked",
      "Unlimited teams & providers",
      "90-day data retention",
      "Smart routing & caching",
      "Budget enforcement",
      "Slack alerts",
    ],
    cta: "Start Free Trial",
    ctaStyle: "solid" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited AI spend",
      "Unlimited retention",
      "SSO & RBAC",
      "Custom integrations",
      "Dedicated support",
      "SLA",
    ],
    cta: "Contact Sales",
    ctaStyle: "outline" as const,
    highlighted: false,
  },
];

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Docs", href: "/docs" },
      { label: "Security", href: "/security" },
      {
        label: "Changelog",
        href: "https://github.com/ModelTrack/modeltrack/releases",
      },
    ],
  },
  {
    title: "Developers",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/ModelTrack/modeltrack",
      },
      {
        label: "SDKs",
        href: "https://github.com/ModelTrack/modeltrack/tree/master/sdks",
      },
      {
        label: "API Reference",
        href: "https://github.com/ModelTrack/modeltrack#api-endpoints",
      },
    ],
  },
  {
    title: "Company",
    links: [{ label: "Contact", href: "mailto:hello@modeltrack.ai" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      {
        label: "License",
        href: "https://github.com/ModelTrack/modeltrack/blob/master/LICENSE",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ============================================================ */}
      {/*  A. Navbar                                                    */}
      {/* ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06] transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-0 text-lg font-bold"
          >
            <span className="text-blue-500">Model</span>
            <span className="text-white">Track</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            href="https://app.modeltrack.ai/signup"
            className="inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  B. Hero Section                                              */}
      {/* ============================================================ */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        {/* Subtle radial gradient background (replaces heavy particles) */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] rounded-full bg-blue-500/[0.06] blur-[140px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Shiny badge */}
          <motion.div {...staggerImmediate(0)} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-blue-400" />
              <AnimatedShinyText className="text-sm">
                Open Source — Now in Beta
              </AnimatedShinyText>
              <ArrowRight className="size-3.5 text-gray-500" />
            </div>
          </motion.div>

          <motion.h1
            {...staggerImmediate(1)}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08]"
          >
            Know exactly what{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              your AI costs
            </span>
          </motion.h1>

          <motion.p
            {...staggerImmediate(2)}
            className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            ModelTrack sits between your app and every LLM API. Track tokens,
            enforce budgets, route to cheaper models — all in real-time.
          </motion.p>

          <motion.div
            {...staggerImmediate(3)}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="https://app.modeltrack.ai/signup">
              <ShimmerButton
                shimmerColor="#93c5fd"
                shimmerSize="0.05em"
                background="rgba(59,130,246,1)"
                borderRadius="12px"
                className="px-7 py-3.5 text-sm font-semibold text-white"
              >
                <span className="flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </span>
              </ShimmerButton>
            </Link>
            <Link
              href="https://github.com/ModelTrack/modeltrack"
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-gray-300 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12] transition-all duration-300 backdrop-blur-sm"
            >
              <Github className="size-4" />
              View on GitHub
            </Link>
          </motion.div>

          {/* Hero Interactive Dashboard Preview */}
          <motion.div
            {...staggerImmediate(4)}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            {/* Glow behind preview */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -inset-8 bg-blue-500/[0.04] blur-[60px] rounded-3xl pointer-events-none" />

            <div className="relative">
              <DashboardPreview />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  C. Metrics Bar                                               */}
      {/* ============================================================ */}
      <section className="border-t border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <motion.div
            {...fadeUpImmediate}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                <NumberTicker value={4} className="text-white" />
              </span>
              <span className="text-sm text-gray-500 font-medium">
                LLM Providers
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                {"<"}
                <NumberTicker value={5} className="text-white" />
                <span className="text-lg text-gray-400 ml-0.5">ms</span>
              </span>
              <span className="text-sm text-gray-500 font-medium">
                Latency
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                <NumberTicker value={50} className="text-white" />
                <span className="text-lg text-gray-400 ml-0.5">%</span>
              </span>
              <span className="text-sm text-gray-500 font-medium">
                Cache Savings
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold text-blue-400 tabular-nums">
                Live
              </span>
              <span className="text-sm text-gray-500 font-medium">
                Real-time Budgets
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  D. Features — Product Screenshots                            */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32 scroll-mt-24">
        <DotPattern
          width={24}
          height={24}
          cr={0.8}
          className="text-white/[0.04] [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                control AI costs
              </span>
            </h2>
          </motion.div>

          {/* Feature rows with interactive previews */}
          <div className="space-y-24">
            {screenshotFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              const isTextLeft = feature.layout === "text-left";
              return (
                <motion.div
                  key={feature.title}
                  {...stagger(idx)}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${
                    !isTextLeft ? "lg:grid-flow-dense" : ""
                  }`}
                >
                  {/* Text side */}
                  <div className={!isTextLeft ? "lg:col-start-2" : ""}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                        <Icon className="size-5 text-blue-400" />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-semibold text-white">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-gray-400 leading-relaxed mb-5">
                      {feature.description}
                    </p>
                    <ul className="space-y-2.5">
                      {feature.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2.5 text-sm text-gray-400"
                        >
                          <Check className="size-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Preview side */}
                  <div className={`relative ${!isTextLeft ? "lg:col-start-1" : ""}`}>
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="relative">
                      {feature.preview === "models" && <ModelsPreview />}
                      {feature.preview === "teams" && <TeamsPreview />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Smaller feature cards (no screenshots) */}
          <div className="grid md:grid-cols-3 gap-4 mt-24">
            {smallFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  {...stagger(i)}
                  className="card-glow group relative rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-6 hover:border-blue-500/20 transition-all duration-300"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                        <Icon className="size-5 text-blue-400" />
                      </div>
                      {feature.soon && (
                        <span className="text-[10px] uppercase tracking-wider font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-1.5">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  E. How It Works — Code Section                               */}
      {/* ============================================================ */}
      <section className="py-32 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Just change the base URL.{" "}
              <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">
                Full visibility.
              </span>
            </h2>
          </motion.div>

          <motion.div
            {...stagger(1)}
            className="relative max-w-3xl mx-auto"
          >
            {/* Glow behind terminal */}
            <div className="absolute -inset-4 rounded-3xl bg-blue-500/[0.04] blur-2xl pointer-events-none" />
            <div className="absolute -inset-8 rounded-3xl bg-indigo-500/[0.02] blur-3xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0c14] overflow-hidden">
              <BorderBeam
                size={150}
                duration={10}
                colorFrom="#3B82F6"
                colorTo="#818cf8"
                borderWidth={1}
              />
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="size-3 rounded-full bg-red-500/20" />
                <div className="size-3 rounded-full bg-yellow-500/20" />
                <div className="size-3 rounded-full bg-green-500/20" />
                <span className="ml-3 text-xs text-gray-500 font-mono">
                  app.py
                </span>
              </div>
              <pre className="p-6 text-sm leading-relaxed overflow-x-auto font-mono">
                <code>
                  <span className="text-blue-400">import</span>
                  <span className="text-gray-300"> anthropic</span>
                  {"\n\n"}
                  <span className="text-gray-600">
                    {"# Point your SDK at ModelTrack — everything else stays the same"}
                  </span>
                  {"\n"}
                  <span className="text-gray-300">client = anthropic.</span>
                  <span className="text-blue-400">Anthropic</span>
                  <span className="text-gray-300">(</span>
                  {"\n"}
                  <span className="text-gray-300">{"    "}base_url=</span>
                  <span className="text-green-400">
                    {'"https://proxy.modeltrack.ai/ws/YOUR_WORKSPACE/v1"'}
                  </span>
                  {"\n"}
                  <span className="text-gray-300">)</span>
                  {"\n\n"}
                  <span className="text-gray-300">response = client.</span>
                  <span className="text-yellow-300">messages</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-yellow-300">create</span>
                  <span className="text-gray-300">(</span>
                  {"\n"}
                  <span className="text-gray-300">{"    "}model=</span>
                  <span className="text-green-400">
                    {'"claude-sonnet-4-6"'}
                  </span>
                  <span className="text-gray-300">,</span>
                  {"\n"}
                  <span className="text-gray-300">{"    "}messages=[</span>
                  <span className="text-gray-300">{"{"}</span>
                  <span className="text-green-400">{'"role"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-green-400">{'"user"'}</span>
                  <span className="text-gray-300">, </span>
                  <span className="text-green-400">{'"content"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-green-400">{'"Hello"'}</span>
                  <span className="text-gray-300">{"}"}]</span>
                  {"\n"}
                  <span className="text-gray-300">)</span>
                  {"\n"}
                  <span className="text-gray-600">
                    {"# ModelTrack tracks: tokens, cost, latency, team, feature"}
                  </span>
                </code>
              </pre>
            </div>
          </motion.div>

          <motion.p
            {...stagger(2)}
            className="mt-10 text-center text-sm text-gray-500 max-w-xl mx-auto"
          >
            Works with any LLM SDK — Anthropic, OpenAI, AWS Bedrock, Azure OpenAI.
            No code changes beyond the base URL.
          </motion.p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  F. Integrations — Marquee                                    */}
      {/* ============================================================ */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Works with{" "}
              <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                every LLM provider
              </span>
            </h2>
          </motion.div>

          <motion.div {...stagger(1)}>
            <Marquee pauseOnHover className="[--duration:25s] [--gap:1rem]">
              {providers.map((provider) => (
                <div
                  key={provider.name}
                  className={`card-glow inline-flex items-center gap-3 rounded-xl border px-6 py-4 backdrop-blur-sm ${
                    provider.soon
                      ? "border-white/[0.05] bg-white/[0.01] text-gray-600"
                      : "border-white/[0.08] bg-white/[0.03] text-gray-300"
                  }`}
                >
                  <span className="text-sm font-medium">{provider.name}</span>
                  {provider.soon && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-600 bg-white/[0.05] px-2 py-0.5 rounded-full">
                      soon
                    </span>
                  )}
                </div>
              ))}
            </Marquee>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  G. Pricing                                                   */}
      {/* ============================================================ */}
      <section
        id="pricing"
        className="py-32 border-t border-white/[0.06] bg-white/[0.01] scroll-mt-24"
      >
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...stagger(i)}
                className={`card-glow relative rounded-2xl border p-8 flex flex-col backdrop-blur-xl transition-all duration-300 overflow-visible ${
                  plan.highlighted
                    ? "border-blue-500/30 bg-blue-500/[0.04] scale-[1.02] mt-4"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.highlighted && (
                  <>
                    <BorderBeam
                      size={100}
                      duration={8}
                      colorFrom="#3B82F6"
                      colorTo="#6366f1"
                      borderWidth={1}
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 backdrop-blur-sm">
                        <AnimatedShinyText className="text-xs font-semibold text-blue-300">
                          Most Popular
                        </AnimatedShinyText>
                      </div>
                    </div>
                  </>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-gray-500">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-gray-400"
                    >
                      <Check className="size-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="https://app.modeltrack.ai/signup"
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    plan.ctaStyle === "solid"
                      ? "bg-blue-500 text-white hover:bg-blue-400 hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]"
                      : "border border-white/[0.08] text-gray-300 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  H. Final CTA                                                 */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.06] overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/[0.05] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <motion.h2
            {...fadeUp}
            className="text-3xl lg:text-5xl font-bold tracking-tight"
          >
            Start tracking your AI costs{" "}
            <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
              in 5 minutes
            </span>
          </motion.h2>
          <motion.p
            {...stagger(1)}
            className="mt-5 text-gray-500 text-lg"
          >
            No credit card required. Free forever for small teams.
          </motion.p>
          <motion.div {...stagger(2)} className="mt-10 flex justify-center">
            <Link href="https://app.modeltrack.ai/signup">
              <ShimmerButton
                shimmerColor="#93c5fd"
                shimmerSize="0.05em"
                background="rgba(59,130,246,1)"
                borderRadius="12px"
                className="px-8 py-4 text-base font-semibold text-white"
              >
                <span className="flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </span>
              </ShimmerButton>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  I. Footer                                                    */}
      {/* ============================================================ */}
      <footer className="relative border-t border-white/[0.06] py-16">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={
                          link.href.startsWith("http") ? "_blank" : undefined
                        }
                        className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06]">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-0 text-sm font-bold"
              >
                <span className="text-blue-500">Model</span>
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
        </div>
      </footer>
    </div>
  );
}
