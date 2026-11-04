/** Where a notification takes you. Notifications only store a category
 * (no record id), so each one opens the section where you act on it. */
const destinations: Record<string, { page: string; label: string }> = {
  matches: { page: "mensajes", label: "Ir a Mensajes" },
  messages: { page: "mensajes", label: "Ir a Mensajes" },
  games: { page: "partidas", label: "Ir a Partidas" },
  friends: { page: "amigos", label: "Ir a Amigos" },
  social: { page: "comunidad", label: "Ir a Comunidad" },
  reviews: { page: "perfil", label: "Ver tu calificación" },
};

export function notificationDestination(category: string) {
  return destinations[category] ?? null;
}
