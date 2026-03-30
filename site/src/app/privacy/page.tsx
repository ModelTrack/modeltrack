import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ModelTrack",
  description:
    "How ModelTrack collects, uses, and protects your data. We never store prompt content, response content, or LLM API keys.",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-white mt-12 mb-4">{children}</h2>
  );
}

export default function PrivacyPage() {
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

      {/* Content */}
      <main className="flex-1 pt-16">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

          <p className="text-gray-400 leading-relaxed mb-6">
            ModelTrack (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides an AI cost tracking proxy service.
            This policy explains what data we collect, how we use it, and your rights.
            We&apos;ve kept it readable on purpose — no walls of legalese.
          </p>

          <SectionHeading>What data we collect</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            When you create an account and use ModelTrack, we collect:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Account information: email address and display name",
              "Usage data: pages visited, features used, session duration",
              "LLM request metadata: model name, token counts, cost, latency, team/app/feature attribution headers, timestamps",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <SectionHeading>What we do NOT collect</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            This is just as important as what we do collect. ModelTrack explicitly does not collect or store:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Prompt content (your messages to LLMs)",
              "Response content (what LLMs return to you)",
              "LLM API keys (these pass through the proxy in memory only and are never persisted)",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-400 leading-relaxed mb-4">
            We track the cost of your AI usage, not the content. See our{" "}
            <Link href="/security" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
              Security page
            </Link>{" "}
            for a detailed breakdown of what a cost event looks like.
          </p>

          <SectionHeading>How we use your data</SectionHeading>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Provide the service: display your cost dashboards, enforce budgets, generate reports",
              "Analytics: understand how the product is used so we can improve it",
              "Communication: send you account-related emails (billing, security notices, service updates)",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-400 leading-relaxed mb-4">
            We do not sell your data. We do not use your data for advertising. We do not
            share your data with third parties for their marketing purposes.
          </p>

          <SectionHeading>Data storage</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Your data is stored on Google Cloud infrastructure in the United States.
            All data is encrypted at rest (Google-managed encryption) and in transit (TLS).
          </p>

          <SectionHeading>Data retention</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Cost events are stored for the duration of your plan&apos;s retention period
            (e.g., 7 days on Free, 90 days on Pro). When you delete your account, all
            associated data — including cost events, account information, and settings
            — is permanently deleted within 30 days.
          </p>

          <SectionHeading>Third-party services</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            We use the following third-party services to operate ModelTrack:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Google Cloud (Cloud Run, Firestore): infrastructure and data storage",
              "Firebase Authentication: account login and session management",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-400 leading-relaxed mb-4">
            We do not sell or share your data with any other third parties.
          </p>

          <SectionHeading>Cookies</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            We use minimal cookies — only what is required for Firebase Authentication
            to maintain your login session. We do not use tracking cookies, advertising
            cookies, or third-party analytics cookies.
          </p>

          <SectionHeading>Your rights</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            You can:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Delete your account at any time from your account settings",
              "Export your cost data via the API or dashboard",
              "Request a copy of all data we hold about you",
              "Contact us with any privacy questions or concerns",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <SectionHeading>Changes to this policy</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            If we make significant changes to this policy, we&apos;ll notify you via email
            and update the &quot;Last updated&quot; date at the top of this page.
          </p>

          <SectionHeading>Contact</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Questions about this privacy policy? Email us at{" "}
            <a
              href="mailto:support@modeltrack.ai"
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              support@modeltrack.ai
            </a>.
          </p>
        </div>
      </main>
    </div>
  );
}
