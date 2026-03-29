import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — ModelTrack",
  description:
    "ModelTrack documentation. Learn how to track, control, and optimize your AI costs.",
};

const sidebarLinks = [
  { label: "Quickstart", href: "/docs" },
  { label: "Python SDK", href: "/docs/python" },
  { label: "Node.js SDK", href: "/docs/node" },
  { label: "LangChain & Frameworks", href: "/docs/langchain" },
  { label: "Docker & Deployment", href: "/docs/docker" },
  { label: "Configuration", href: "/docs/configuration" },
  { label: "API Keys & Security", href: "/docs/api-keys" },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0 text-lg font-bold">
            <span className="text-emerald-500">Model</span>
            <span className="text-white">Track</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/docs"
              className="text-sm text-white font-medium transition-colors duration-200"
            >
              Docs
            </Link>
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
              href="https://github.com/ModelTrack/modeltrack"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              GitHub
            </Link>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-white/5">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Documentation
            </p>
            <nav className="flex flex-col gap-1">
              {sidebarLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-16">{children}</div>
        </main>
      </div>
    </div>
  );
}
