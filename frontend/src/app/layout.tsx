import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AgriGPT — AI Copilot for Smarter Farming",
    template: "%s | AgriGPT",
  },
  description:
    "AgriGPT helps farmers plan crops, estimate farm profitability, analyze crop health, understand market conditions and make smarter farming decisions with AI.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AgriGPT — AI Copilot for Smarter Farming",
    description:
      "Plan crops, estimate costs and returns, analyze crop health from a photo and understand market conditions — AI-powered decision support for farmers.",
    type: "website",
    siteName: "AgriGPT",
    url: APP_URL,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "AgriGPT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgriGPT — AI Copilot for Smarter Farming",
    description:
      "Plan crops, estimate profitability, analyze crop health and understand market conditions with AI.",
    images: ["/icon-512.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
