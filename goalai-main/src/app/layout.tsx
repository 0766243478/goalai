import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gan.network";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Gan Network - AI-Powered Decision Elimination System | 3 Daily Tasks",
    template: "%s | Gan Network",
  },
  description:
    "Gan Network eliminates decision fatigue by giving you exactly 3 personalized daily tasks calibrated to your capacity. Stop deciding. Start executing. AI-powered productivity without the overwhelm.",
  keywords: [
    "decision fatigue",
    "AI task manager",
    "daily task planner",
    "productivity app",
    "decision elimination",
    "AI productivity",
    "task management",
    "focus app",
    "daily planner",
    "Gan Network",
    "personalized tasks",
    "reduce overwhelm",
    "3 daily tasks",
    "smart task generation",
  ],
  authors: [{ name: "Gan Network" }],
  creator: "Gan Network",
  publisher: "Gan Network",
  manifest: "/manifest.json",
  category: "productivity",
  applicationName: "Gan Network",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "Gan Network",
    title: "Gan Network - Stop Deciding. Start Executing.",
    description:
      "AI-powered Decision Elimination System. Get exactly 3 personalized daily tasks calibrated to your energy and capacity. No more decision fatigue.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Gan Network - Decision Elimination System",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Gan Network - AI-Powered Decision Elimination System",
    description:
      "Stop deciding. Start executing. 3 AI-generated tasks every day, calibrated to your capacity.",
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
    title: "Gan Network",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Gan Network",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "AI-powered Decision Elimination System that provides exactly 3 personalized daily tasks calibrated to your capacity. Eliminates decision fatigue through intelligent task generation.",
  url: appUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-powered daily task generation",
    "Personalized to your goals and capacity",
    "Internal Trust Score for adaptive difficulty",
    "Decision fatigue elimination",
    "3 focused tasks per day (Execute, Value, Reset)",
    "Progressive Web App - works offline",
    "No account required - guest mode",
  ],
  screenshot: `${appUrl}/icons/icon-512.png`,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Gan Network?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gan Network is an AI-powered Decision Elimination System that gives you exactly 3 personalized daily tasks calibrated to your energy and capacity. It eliminates decision fatigue by deciding what you should focus on each day.",
      },
    },
    {
      "@type": "Question",
      name: "How does Gan Network work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gan Network uses AI to generate 3 daily tasks across three categories: Execute (your main goal), Value (income-generating skill), and Reset (mental clarity). Tasks adapt based on your Internal Trust Score, which tracks your completion patterns.",
      },
    },
    {
      "@type": "Question",
      name: "Is Gan Network free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Gan Network is completely free. No sign-up required - you can start as a guest immediately. It works as a Progressive Web App that you can add to your home screen.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Gan Network different from other task managers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unlike traditional task managers where you decide what to do, Gan Network decides for you. It limits you to exactly 3 tasks per day, uses AI to calibrate difficulty to your capacity, and adapts over time based on your completion patterns. No gamification, no streaks - just calm, focused execution.",
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
