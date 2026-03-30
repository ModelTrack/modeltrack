import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ModelTrack",
  description:
    "Terms of Service for ModelTrack, the AI cost tracking proxy.",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-white mt-12 mb-4">{children}</h2>
  );
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

          <p className="text-gray-400 leading-relaxed mb-6">
            These terms govern your use of ModelTrack (&quot;the Service&quot;), operated by
            ModelTrack (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using ModelTrack, you agree to these terms.
          </p>

          <SectionHeading>1. Service description</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            ModelTrack is an AI cost tracking proxy that sits between your application
            and LLM API providers (Anthropic, OpenAI, AWS Bedrock, Azure OpenAI, etc.).
            It tracks token usage, costs, and latency in real-time without modifying
            your requests or responses.
          </p>

          <SectionHeading>2. Account responsibilities</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            You are responsible for:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Keeping your account credentials secure",
              "Providing accurate account information",
              "All activity that occurs under your account",
              "Maintaining the security of your own LLM API keys",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8594;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <SectionHeading>3. Acceptable use</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            You agree not to use ModelTrack to:
          </p>
          <ul className="space-y-2 mb-4 ml-1">
            {[
              "Violate the terms of service of any LLM provider",
              "Generate, transmit, or facilitate illegal content",
              "Attempt to gain unauthorized access to ModelTrack systems or other users' data",
              "Interfere with or disrupt the Service or its infrastructure",
              "Resell or redistribute the Service without written permission",
            ].map((item) => (
              <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <SectionHeading>4. Free tier</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            The free tier includes up to $1,000/month in tracked AI spend, 1 team,
            2 providers, and 7-day data retention. The free tier is provided without
            a service-level agreement (SLA). We may modify free tier limits at any time
            with reasonable notice.
          </p>

          <SectionHeading>5. Paid tiers</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Paid plans (Pro, Enterprise) offer higher limits, longer retention, and
            additional features. We reserve the right to adjust pricing with 30 days&apos;
            notice. Current pricing is listed on our{" "}
            <Link href="/#pricing" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
              pricing page
            </Link>.
          </p>

          <SectionHeading>6. API key handling</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Your LLM API keys are passed through the ModelTrack proxy to upstream
            providers in real-time. Keys exist only in memory during the request
            lifecycle and are never stored, logged, or persisted by ModelTrack.
            For full details, see our{" "}
            <Link href="/security" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
              Security page
            </Link>.
          </p>

          <SectionHeading>7. Limitation of liability</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            ModelTrack is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
            any kind, either express or implied. We do not warrant that the Service
            will be uninterrupted, error-free, or secure.
          </p>
          <p className="text-gray-400 leading-relaxed mb-4">
            To the maximum extent permitted by law, ModelTrack shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, data, or business
            opportunities, arising from your use of the Service.
          </p>
          <p className="text-gray-400 leading-relaxed mb-4">
            Our total liability for any claim arising from or related to the Service
            shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>

          <SectionHeading>8. Termination</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            You can delete your account at any time from your account settings. Upon
            deletion, all your data will be permanently removed within 30 days.
          </p>
          <p className="text-gray-400 leading-relaxed mb-4">
            We may suspend or terminate your account if you violate these terms,
            engage in abusive behavior, or if required by law. We will attempt to
            notify you before suspension when reasonably possible.
          </p>

          <SectionHeading>9. Changes to terms</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            We may update these terms from time to time. When we make significant
            changes, we will notify you via the email address associated with your
            account and update the &quot;Last updated&quot; date at the top of this page.
            Continued use of the Service after changes constitutes acceptance.
          </p>

          <SectionHeading>10. Governing law</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            These terms are governed by the laws of the State of California, United
            States, without regard to conflict of law provisions. Any disputes shall
            be resolved in the courts of San Francisco, California.
          </p>

          <SectionHeading>Contact</SectionHeading>
          <p className="text-gray-400 leading-relaxed mb-4">
            Questions about these terms? Email us at{" "}
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
