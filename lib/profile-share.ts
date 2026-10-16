const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sharedProfileId(search: string): string | null {
  const id = new URLSearchParams(search).get("golfista");
  return id && uuid.test(id) ? id : null;
}
export function profileShareUrl(origin: string, id: string): string {
  if (!uuid.test(id)) throw new Error("Perfil no disponible para compartir.");
  const url = new URL("/", origin);
  url.searchParams.set("golfista", id);
  url.hash = "amigos";
  return url.href;
}
// Búsqueda literal: % y _ no se interpretan como comodines del usuario.
export function nameSearchPattern(name: string) {
  return "%" + name.trim().replace(/[\\%_]/g, "\\$&") + "%";
}
