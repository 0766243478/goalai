import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gaolaif.org";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Gaolaif | Calm Certainty Framework",
    template: "%s | Gaolaif",
  },
  description:
    "A behavioral design workspace built to eliminate friction and provide psychological relief through execution, powered by autonomous AI pattern analysis. No gamification.",
  keywords: [
    "behavioral design",
    "execution engine",
    "user trust score",
    "reduce friction",
    "mental bandwidth optimization",
    "calm certainty",
    "productivity framework",
    "Gaolaif",
    "decision elimination",
    "AI pattern analysis",
    "friction reduction",
    "execution system",
  ],
  authors: [{ name: "Gaolaif" }],
  creator: "Gaolaif",
  publisher: "Gaolaif",
  manifest: "/manifest.json",
  category: "productivity",
  applicationName: "Gaolaif",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "Gaolaif",
    title: "Gaolaif | Calm Certainty Framework",
    description:
      "A behavioral design workspace built to eliminate friction and provide psychological relief through execution, powered by autonomous AI pattern analysis. No gamification. No streaks. Calm, focused execution.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Gaolaif — Calm Certainty Framework",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@gaolaif",
    title: "Gaolaif | Calm Certainty Framework",
    description:
      "Eliminate friction. Execute with calm certainty. AI-powered behavioral design workspace. No gamification.",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: appUrl,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gaolaif",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#233dff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Gaolaif",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "A behavioral design workspace that eliminates friction through autonomous AI pattern analysis. Calm certainty. No gamification.",
  url: appUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-powered friction detection and buffer injection",
    "Internal Trust Score for adaptive difficulty",
    "Calm Certainty tone — no gamification, no streaks",
    "3 focused tasks per day (Execute, Value, Reset)",
    "Autonomous AI pattern analysis without user effort",
    "Progressive Web App - works offline",
  ],
  screenshot: `${appUrl}/icons/icon-512.png`,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      "name": "What is Gaolaif?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Gaolaif is a behavioral design workspace that eliminates friction through autonomous AI pattern analysis. It gives you exactly 3 daily tasks calibrated to your capacity and adapts based on your Internal Trust Score. No gamification, no streaks — just calm, focused execution.",
      },
    },
    {
      "@type": "Question",
      "name": "How does Gaolaif's friction detection work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Gaolaif analyzes your task completion patterns, interruption history, and SWOT profile to identify high-risk windows for friction. It autonomously injects focus buffers, compresses non-essential tasks, and adjusts load to match your current capacity. You don't configure anything — the engine adapts to you.",
      },
    },
    {
      "@type": "Question",
      "name": "Is Gaolaif free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Gaolaif is completely free. No sign-up required — you can start as a guest immediately. It works as a Progressive Web App that you can add to your home screen.",
      },
    },
    {
      "@type": "Question",
      "name": "What makes Gaolaif different from other productivity tools?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Unlike traditional task managers where you decide what to do, Gaolaif decides for you. It limits you to exactly 3 tasks per day, uses autonomous AI to detect friction patterns and inject buffers before you fail, and adapts over time based on your completion patterns. No gamification, no streaks, no fake rewards — just calm certainty.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="canonical" href={appUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body
        className="antialiased bg-relief-bg min-h-screen"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
