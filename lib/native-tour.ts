/** Steps of the short first-run tour in the iOS app. Each step points at a
 * bottom tab and opens it, so the golfer sees the screen being described. */
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
    text: "Busca a tus conocidos por nombre y acepta sus solicitudes de amistad.",
  },
  {
    tab: "mensajes",
    title: "Coordina la ronda",
    text: "Cuando hay match o te unes a una partida, la conversación aparece aquí.",
  },
  {
    tab: "perfil",
    title: "Tu tarjeta de golfista",
    text: "Edita tu foto, tu handicap y tu bio. Desliza desde el borde para volver y hacia abajo para actualizar.",
  },
];

/** Start only for a signed-in account on its first open, on the default
 * Descubrir screen (never over a deep link) and with nothing else open. */
export function shouldStartTour({
  native,
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
  return (
    native && !loading && !!userId && page === "descubrir" && !busy && !seen
  );
}

export const nativeTourKey = (userId: string) =>
  `fairway.native-tour.v1:${userId}`;
