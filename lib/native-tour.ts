/** Steps of the first-run iOS tour. Friends uses the header shortcut; the
 * other destinations use bottom tabs. Creation opens only on a deliberate tap. */
export const nativeTourSteps = [
  {
    tab: "descubrir",
    title: "Encuentra con quién jugar",
    text: "Desliza la tarjeta o toca el corazón si te gustaría jugar con esa persona. «Ver perfil» te cuenta más.",
  },
  {
    tab: "partidas",
    title: "Súmate a una partida",
    text: "Aquí están las partidas abiertas. Para armar la tuya, usa «Crear partida» en Descubrir.",
  },
  {
    tab: "amigos",
    title: "Arma tu círculo",
    text: "Amigos está arriba, junto a las notificaciones. Busca a tus conocidos y acepta sus solicitudes. El + de abajo abre Crear historia.",
  },
  {
    tab: "mensajes",
    title: "Coordina la ronda",
    text: "Cuando hay match o te unes a una partida, la conversación aparece aquí.",
  },
  {
    tab: "perfil",
    title: "Tu tarjeta de golfista",
    text: "Edita tu foto, tu handicap y tu descripción, y anota tus scores. Desliza desde el borde para volver y hacia abajo para actualizar.",
  },
];

/** Browser instructions use the existing sidebar/mobile navigation. */
export const websiteTourSteps = [
  {
    ...nativeTourSteps[0],
    text: "Explora golfistas y toca el corazón si te gustaría jugar con alguien. «Ver perfil» te cuenta más.",
  },
  {
    ...nativeTourSteps[1],
    text: "Consulta el calendario o la lista de partidas abiertas. Usa «Crear partida» para organizar la tuya.",
  },
  {
    tab: "comunidad",
    title: "Comparte el juego",
    text: "Lee lo que comparte la comunidad y usa «Crear historia» para compartir una foto de tu ronda.",
  },
  {
    ...nativeTourSteps[2],
    text: "Busca a tus conocidos por nombre y acepta sus solicitudes de amistad.",
  },
  nativeTourSteps[3],
  {
    ...nativeTourSteps[4],
    text: "Edita tu foto, tu handicap y tu descripción. Usa el menú de Fairway para volver a cualquiera de estas secciones.",
  },
];

/** Start only for a signed-in account on its first open, on the default
 * Descubrir screen (never over a deep link) and with nothing else open. */
export function shouldStartTour({
  loading,
  userId,
  page,
  busy,
  seen,
}: {
  native: boolean;
  loading: boolean;
  userId?: string | null;
  page: string;
  busy: boolean;
  seen: boolean;
}) {
  return !loading && !!userId && page === "descubrir" && !busy && !seen;
}

export const nativeTourKey = (userId: string, native = true) =>
  `fairway.${native ? "native" : "website"}-tour.v1:${userId}`;
