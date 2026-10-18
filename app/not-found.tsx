import type { Metadata } from "next";
import { Flag, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada · Fairway",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main className="auth-screen">
      <section className="panel" aria-labelledby="not-found-title">
        <Flag size={32} aria-hidden="true" />
        <p className="eyebrow">FAIRWAY · ERROR 404</p>
        <h1 id="not-found-title">Esta página no existe.</h1>
        <p>
          El enlace puede estar incompleto o la página pudo haber cambiado de
          dirección. Vuelve a Fairway para consultar clubes o encontrar una
          partida.
        </p>
        <a href="/" className="button primary">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a Fairway
        </a>
      </section>
    </main>
  );
}
