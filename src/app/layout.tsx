import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/playbeat/auth-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  title: "PlayBeat Digital — AI that grooves with you · playbeatdigital.world",
  description:
    "An AI chatbox that feels like a late-night studio session — warm, fast, and always in your corner. Talk to the beat of your ideas: ask anything, build anything.",
  keywords: [
    "PlayBeat Digital",
    "playbeatdigital.world",
    "AI chatbox",
    "VOLTAIRE",
    "People Playing With The Beat",
    "creative co-pilot",
    "late-night studio",
  ],
  authors: [{ name: "PlayBeat Digital" }],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "PlayBeat Digital — AI that grooves with you",
    description:
      "An AI chatbox that feels like a late-night studio session. Ask anything. Build anything.",
    siteName: "playbeatdigital.world",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayBeat Digital — AI that grooves with you",
    description: "Talk to the beat of your ideas.",
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
        className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} font-sans antialiased bg-void text-ink`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
