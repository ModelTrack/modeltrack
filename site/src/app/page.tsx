"use client";

import { motion } from "framer-motion";
import {
  Activity,
  GitBranch,
  Zap,
  Shield,
  TrendingUp,
  FileText,
  ArrowRight,
  Github,
  Check,
} from "lucide-react";
import Link from "next/link";

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
    transition: { ...fadeUp.transition, delay: i * 0.1 },
  };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/ModelTrack/modeltrack" },
];

const metrics = [
  "4 LLM Providers",
  "Sub-5ms Latency",
  "20-50% Cache Savings",
  "Real-time Budgets",
];

const features = [
  {
    icon: Activity,
    title: "Cost Tracking",
    description:
      "Track every token across Anthropic, OpenAI, Bedrock, and Azure. Per-request granularity with team, app, and feature attribution.",
  },
  {
    icon: GitBranch,
    title: "Smart Routing",
    description:
      "Automatically route to cheaper models when teams approach budget limits. Save 30-70% without changing code.",
  },
  {
    icon: Zap,
    title: "Response Caching",
    description:
      "Cache identical requests to eliminate duplicate API calls. 20-50% cost reduction with zero latency overhead.",
  },
  {
    icon: Shield,
    title: "Budget Enforcement",
    description:
      "Set per-team and per-app budgets with hard limits. Block or warn before overspending — at the proxy level.",
  },
  {
    icon: TrendingUp,
    title: "Cost Forecasting",
    description:
      "Predict next month's AI spend with confidence intervals. Scenario modeling for traffic changes and model migrations.",
  },
  {
    icon: FileText,
    title: "Executive Reports",
    description:
      "Auto-generated weekly and monthly reports with recommendations. Export CSV, schedule to Slack.",
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
      { label: "Changelog", href: "https://github.com/ModelTrack/modeltrack/releases" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "GitHub", href: "https://github.com/ModelTrack/modeltrack" },
      { label: "SDKs", href: "https://github.com/ModelTrack/modeltrack/tree/master/sdks" },
      { label: "API Reference", href: "https://github.com/ModelTrack/modeltrack#api-endpoints" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@modeltrack.ai" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "License", href: "https://github.com/ModelTrack/modeltrack/blob/master/LICENSE" },
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
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0 text-lg font-bold">
            <span className="text-emerald-500">Model</span>
            <span className="text-white">Track</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
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
      {/*  B. Hero Section                                              */}
      {/* ============================================================ */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        {/* Radial gradient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <motion.h1
            {...stagger(0)}
            className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Know exactly what
            <br />
            your AI costs
          </motion.h1>

          <motion.p
            {...stagger(1)}
            className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            ModelTrack sits between your app and every LLM API. Track tokens,
            enforce budgets, route to cheaper models — all in real-time.
          </motion.p>

          <motion.div
            {...stagger(2)}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="https://github.com/ModelTrack/modeltrack#quick-start"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-black hover:bg-emerald-400 transition-colors duration-200"
            >
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="https://github.com/ModelTrack/modeltrack"
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors duration-200"
            >
              <Github className="size-4" />
              View on GitHub
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  C. Metrics Bar                                               */}
      {/* ============================================================ */}
      <section className="border-t border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <motion.div
            {...fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
          >
            {metrics.map((metric) => (
              <p key={metric} className="text-sm text-gray-500 font-medium">
                {metric}
              </p>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  D. Features Bento Grid                                       */}
      {/* ============================================================ */}
      <section id="features" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Everything you need to control AI costs
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  {...stagger(i)}
                  className="group rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 hover:border-emerald-500/20 transition-colors duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-lg bg-emerald-500/10">
                      <Icon className="size-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-1">
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
      {/*  E. How It Works                                              */}
      {/* ============================================================ */}
      <section className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              One line of code. Full visibility.
            </h2>
          </motion.div>

          <motion.div
            {...stagger(1)}
            className="max-w-3xl mx-auto rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="size-3 rounded-full bg-white/10" />
              <div className="size-3 rounded-full bg-white/10" />
              <div className="size-3 rounded-full bg-white/10" />
              <span className="ml-2 text-xs text-gray-500 font-mono">
                app.py
              </span>
            </div>
            <pre className="p-6 text-sm leading-relaxed overflow-x-auto font-mono">
              <code>
                <span className="text-blue-400">import</span>
                <span className="text-gray-300"> modeltrack  </span>
                <span className="text-gray-600">
                  {
                    "# That's it. All LLM calls are now tracked."
                  }
                </span>
                {"\n\n"}
                <span className="text-gray-300">client = </span>
                <span className="text-emerald-400">anthropic</span>
                <span className="text-gray-300">.Anthropic()</span>
                {"\n"}
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
                  # ModelTrack automatically tracks: tokens, cost, latency,
                  team, feature
                </span>
              </code>
            </pre>
          </motion.div>

          <motion.p
            {...stagger(2)}
            className="mt-8 text-center text-sm text-gray-500 max-w-xl mx-auto"
          >
            Or point any LLM SDK at the ModelTrack proxy. Works with Anthropic,
            OpenAI, AWS Bedrock, and Azure OpenAI.
          </motion.p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  F. Integrations                                              */}
      {/* ============================================================ */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Works with every LLM provider
            </h2>
          </motion.div>

          <motion.div
            {...stagger(1)}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {providers.map((provider) => (
              <span
                key={provider.name}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  provider.soon
                    ? "border-white/5 text-gray-600"
                    : "border-white/10 text-gray-400"
                }`}
              >
                {provider.name}
                {provider.soon && (
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    soon
                  </span>
                )}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  G. Pricing                                                   */}
      {/* ============================================================ */}
      <section id="pricing" className="py-32 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Simple, transparent pricing
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...stagger(i)}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
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
                      className="flex items-start gap-2 text-sm text-gray-400"
                    >
                      <Check className="size-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="https://github.com/ModelTrack/modeltrack#quick-start"
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    plan.ctaStyle === "solid"
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
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
      <section className="py-32 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2
            {...fadeUp}
            className="text-3xl lg:text-4xl font-bold"
          >
            Start tracking your AI costs in 5 minutes
          </motion.h2>
          <motion.p
            {...stagger(1)}
            className="mt-4 text-gray-500"
          >
            No credit card required. Free forever for small teams.
          </motion.p>
          <motion.div {...stagger(2)} className="mt-8">
            <Link
              href="https://github.com/ModelTrack/modeltrack#quick-start"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-medium text-black hover:bg-emerald-400 transition-colors duration-200"
            >
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  I. Footer                                                    */}
      {/* ============================================================ */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
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
        </div>
      </footer>
    </div>
  );
}
