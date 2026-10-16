export const PUBLIC_PAGES = [
  "inicio",
  "descubrir",
  "clubes",
  "privacidad",
] as const;
export function requiresAccount(page: string) {
  return !PUBLIC_PAGES.some((p) => p === page);
}
export const accountFeatures: Record<
  string,
  { title: string; description: string }
> = {
  partidas: {
    title: "Arma tu próximo foursome",
    description: "Crea partidas, solicita un lugar y conversa con tu grupo.",
  },
  comunidad: {
    title: "Forma parte de la conversación",
    description:
      "Comparte tus rondas y descubre las historias de otros golfistas.",
  },
  mensajes: {
    title: "Una buena ronda empieza con un hola",
    description:
      "Tus conversaciones y matches son privados. Inicia sesión para verlos.",
  },
  perfil: {
    title: "Tu espacio en el fairway",
    description:
      "Crea tu perfil, elige tu club y encuentra golfistas con tus mismos horarios.",
  },
  scores: {
    title: "Cada golpe cuenta",
    description:
      "Guarda tus scorecards y construye un historial que siempre puedas consultar.",
  },
  estadisticas: {
    title: "Descubre cómo evoluciona tu juego",
    description: "Tus estadísticas se calculan a partir de tus propias rondas.",
  },
  hoy: {
    title: "Encuentra compañía para hoy",
    description:
      "Comparte tu disponibilidad y organiza una partida con tu comunidad.",
  },
  ajustes: {
    title: "Tu cuenta, a tu manera",
    description:
      "Gestiona tu perfil, tus preferencias y la seguridad de tu cuenta.",
  },
  admin: {
    title: "Acceso de administración",
    description:
      "Esta sección requiere una cuenta con permisos administrativos.",
  },
  notificaciones: {
    title: "Tus novedades, en un solo lugar",
    description:
      "Inicia sesión para ver mensajes, solicitudes y avisos de tus partidas.",
  },
};
