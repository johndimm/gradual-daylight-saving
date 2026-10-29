import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gradual Daylight Saving",
  description: "What if clocks shifted smoothly instead of jumping an hour?",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "What if daylight saving happened gradually?",
    description:
      "Two clocks side by side — one jumps an hour twice a year, the other shifts seconds per day. Watch them diverge and converge through the year.",
    url: "https://gradual.johndimm.org",
    siteName: "Gradual Daylight Saving",
    type: "website",
    images: [
      {
        url: "https://gradual.johndimm.org/og.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "What if daylight saving happened gradually?",
    description:
      "Two clocks side by side — one jumps an hour, the other shifts seconds per day.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <div style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999, display: 'flex', gap: 6 }}>
          <a href="https://www.johndimm.org" title="All apps — John Dimm" aria-label="All apps"
             style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(20,20,22,0.82)', color: '#e5e5e5', fontSize: 15, textDecoration: 'none', backdropFilter: 'blur(4px)' }}>🏠</a>
        </div>
      </body>
    </html>
  );
}
