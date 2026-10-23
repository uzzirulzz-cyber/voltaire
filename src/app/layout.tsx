import type { Metadata, Viewport } from "next";
import { Sora, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayBeat AI — Your ideas, in motion · playbeatdigital.world",
  description:
    "A ComfyUI-node-graph-inspired AI chat studio. Every conversation flows through Prompt → Router → KIMI Core → Deliver, powered by KIMI. Built by PlayBeat Digital.",
  keywords: [
    "PlayBeat AI",
    "playbeatdigital.world",
    "KIMI",
    "node graph",
    "ComfyUI",
    "AI chat",
    "creative co-pilot",
  ],
  authors: [{ name: "PlayBeat Digital" }],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "PlayBeat AI — Your ideas, in motion",
    description:
      "Chat wired into a live node graph: prompt → route → generate → deliver. The quiet studio for your next big idea.",
    siteName: "playbeatdigital.world",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat AI — Your ideas, in motion",
    description:
      "Chat wired into a live node graph: prompt → route → generate → deliver.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${inter.variable} ${geistMono.variable} font-sans antialiased bg-navy-deep text-silver-lt`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
