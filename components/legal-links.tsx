import { legalDocuments, legalIds } from "@/lib/legal";
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Información del sitio">
      {legalIds.map((id) => (
        <a key={id} href={`/legal/${id}/`}>
          {legalDocuments[id].title}
        </a>
      ))}
    </nav>
  );
}
export function RegistrationConsent() {
  return (
    <span>
      Soy mayor de 18 años, acepto los{" "}
      <a href="/legal/terminos/" target="_blank" rel="noreferrer">
        términos de uso (nueva pestaña)
      </a>{" "}
      y he leído la{" "}
      <a href="/legal/privacidad/" target="_blank" rel="noreferrer">
        información de privacidad (nueva pestaña)
      </a>{" "}
      sobre el uso de mis datos para mi cuenta y las funciones de Fairway.
    </span>
  );
}
