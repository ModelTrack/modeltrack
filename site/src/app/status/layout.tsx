import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Model Status — Real-time LLM API Monitoring | ModelTrack",
  description:
    "Live status and performance monitoring for Claude, GPT-4, and other LLM APIs. Check latency, uptime, and time-to-first-token.",
  openGraph: {
    title: "AI Model Status — Real-time LLM API Monitoring | ModelTrack",
    description:
      "Live status and performance monitoring for Claude, GPT-4, and other LLM APIs. Check latency, uptime, and time-to-first-token.",
    url: "https://modeltrack.ai/status",
    siteName: "ModelTrack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Model Status — Real-time LLM API Monitoring | ModelTrack",
    description:
      "Live status and performance monitoring for Claude, GPT-4, and other LLM APIs. Check latency, uptime, and time-to-first-token.",
  },
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
