import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "AgriGPT — AI-Powered Farmer Income Optimization",
    template: "%s | AgriGPT",
  },
  description:
    "AI crop recommendations, disease detection, profit prediction, market intelligence and an expert AI copilot — built to raise farmer income.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "AgriGPT — AI-Powered Farmer Income Optimization",
    description:
      "AI crop recommendations, disease detection, profit prediction, market intelligence and an expert AI copilot for Indian farmers.",
    type: "website",
    siteName: "AgriGPT",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "AgriGPT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgriGPT — AI-Powered Farmer Income Optimization",
    description: "AI crop recommendations, disease detection, market intelligence and an expert AI copilot for Indian farmers.",
    images: ["/icon-512.png"],
  },
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
