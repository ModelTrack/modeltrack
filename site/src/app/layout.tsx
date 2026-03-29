import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ModelTrack — Real-time AI cost control",
  description:
    "ModelTrack sits between your app and every LLM API. Track tokens, enforce budgets, route to cheaper models — all in real-time.",
  openGraph: {
    title: "ModelTrack — Real-time AI cost control",
    description:
      "Track tokens, enforce budgets, route to cheaper models — all in real-time.",
    url: "https://modeltrack.ai",
    siteName: "ModelTrack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ModelTrack — Real-time AI cost control",
    description:
      "Track tokens, enforce budgets, route to cheaper models — all in real-time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0F] text-white grain">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
