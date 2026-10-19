/** Public operator information. Never fill missing details with inferred personal data. */
export const legalOperator = {
  names: "Jaime Gonzalez Alvarez y Rodrigo Calderon Knight",
  address: "Jardín de los Cardenales 630, El Bosque Country Club" as
    string | null,
  email: "fairway.rj@gmail.com" as string | null,
};
export const legalRevision = "19 de octubre de 2026";
export const legalDocuments = {
  privacidad: {
    title: "Privacidad",
    description:
      "Datos que utiliza Fairway, ubicación opcional y controles de tu cuenta.",
  },
  terminos: {
    title: "Términos de uso",
    description:
      "Condiciones para participar en la comunidad de golf de Fairway.",
  },
  cookies: {
    title: "Cookies y almacenamiento",
    description:
      "Sesión, preferencias y servicios externos utilizados por Fairway.",
  },
  pagos: {
    title: "Pagos y reembolsos",
    description:
      "Información sobre el servicio gratuito de Fairway y los acuerdos con terceros.",
  },
  creditos: {
    title: "Créditos de imágenes y software",
    description: "Origen de las imágenes, tipografía e iconos de Fairway.",
  },
} as const;
export type LegalDocumentId = keyof typeof legalDocuments;
export const legalIds = Object.keys(legalDocuments) as LegalDocumentId[];
