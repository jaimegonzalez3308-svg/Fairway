import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { AccessibilityProvider } from "@/components/accessibility-mode";
import { ACCESSIBILITY_BOOTSTRAP } from "@/lib/accessibility-mode";
import { site } from "@/lib/site";
import "./globals.css";
import "./clubhouse.css";
import "./hierarchy.css";
import "./landing.css";
import "./interactions.css";
import "./member-details.css";
import "./member-flows.css";
import "./readability.css";
import "./community.css";
import "./native-app.css";
import "./accessibility.css";

const inter = localFont({
  src: [
    {
      path: "./fonts/inter/InterVariable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/inter/InterVariable-Italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  title: site.title,
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: site.name,
    url: site.url,
    title: site.title,
    description: site.description,
    images: [
      {
        url: site.socialImage,
        width: 1200,
        height: 630,
        alt: "Fairway: golfistas y partidas de golf en León, Guanajuato.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: [site.socialImage],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body>
        <Script
          id="fairway-accessibility-preference"
          strategy="beforeInteractive"
        >
          {ACCESSIBILITY_BOOTSTRAP}
        </Script>
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
