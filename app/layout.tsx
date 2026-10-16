import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sourceSans = localFont({
  src: [
    {
      path: "./fonts/SourceSans3-Variable.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "./fonts/SourceSans3-VariableItalic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  variable: "--font-source-sans",
  display: "swap",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Fairway · Encuentra tu próximo foursome",
  description:
    "Tu comunidad de golf en León. Conecta con golfistas, organiza partidas y lleva tu juego más lejos.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sourceSans.variable}>
      <body>{children}</body>
    </html>
  );
}
