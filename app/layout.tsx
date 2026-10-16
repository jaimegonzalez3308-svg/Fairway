import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "Fairway · Encuentra tu próximo foursome",
  description:
    "Tu comunidad de golf en León. Conecta con golfistas, organiza partidas y lleva tu juego más lejos.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
