import { publicOrigin } from "./public-origin";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sharedGameId(search: string): string | null {
  const id = new URLSearchParams(search).get("partida");
  return id && uuid.test(id) ? id : null;
}

export function gameShareUrl(origin: string, id: string): string {
  if (!uuid.test(id)) throw new Error("Partida no disponible para compartir.");
  const url = new URL("/", publicOrigin(origin));
  url.searchParams.set("partida", id);
  url.hash = "partidas";
  return url.href;
}

export function sectionUrl(href: string, page: string): string {
  const url = new URL(href);
  for (const key of [
    "golfista",
    "partida",
    "recovery",
    "code",
    "error",
    "error_code",
    "error_description",
  ])
    url.searchParams.delete(key);
  url.hash = page;
  return url.pathname + url.search + url.hash;
}
