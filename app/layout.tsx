import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Fairway · Encuentra tu próximo foursome",
  description:
    "Tu comunidad de golf en León. Conecta con golfistas, organiza partidas y lleva tu juego más lejos.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
