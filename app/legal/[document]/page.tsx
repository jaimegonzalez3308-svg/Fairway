import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { LegalLinks } from "@/components/legal-links";
import { AccessibilityToggle } from "@/components/accessibility-mode";
import { legalDocuments, legalIds, type LegalDocumentId } from "@/lib/legal";
import { site } from "@/lib/site";
export function generateStaticParams() {
  return legalIds.map((document) => ({ document }));
}
async function resolve(params: Promise<{ document: string }>) {
  const { document } = await params;
  if (!legalIds.includes(document as LegalDocumentId)) notFound();
  return document as LegalDocumentId;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}): Promise<Metadata> {
  const id = await resolve(params),
    info = legalDocuments[id];
  const title = `${info.title} · Fairway`,
    url = new URL(`legal/${id}/`, site.url).href;
  return {
    title,
    description: info.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: info.description,
      url,
      images: [site.socialImage],
    },
    twitter: {
      title,
      description: info.description,
      images: [site.socialImage],
    },
  };
}
export default async function LegalPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const id = await resolve(params);
  return (
    <div className="legal-page">
      <a className="skip-link" href="#legal-content">
        Saltar al contenido
      </a>
      <header className="legal-header">
        <a href="/" className="legal-brand">
          fairway.
        </a>
        <AccessibilityToggle />
      </header>
      <main id="legal-content">
        <a href="/">Volver a Fairway</a>
        <h1>{legalDocuments[id].title}</h1>
        <LegalDocument document={id} />
      </main>
      <footer>
        <LegalLinks />
      </footer>
    </div>
  );
}
