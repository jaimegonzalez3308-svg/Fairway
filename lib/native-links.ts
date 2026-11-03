import { site } from "./site";
import { sharedGameId } from "./game-share";
import { sharedProfileId } from "./profile-share";

export const nativeLinkPages = [
  "descubrir",
  "partidas",
  "scores",
  "mensajes",
  "perfil",
  "comunidad",
  "amigos",
  "clubes",
  "estadisticas",
  "ajustes",
  "hoy",
];
export function parseNativeLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    const custom =
      url.protocol === "com.fairway.app:" &&
      url.host === "open" &&
      ["", "/"].includes(url.pathname);
    const universal =
      url.protocol === "https:" &&
      url.origin === new URL(site.url).origin &&
      url.pathname === "/";
    if (!custom && !universal) return null;
    // These are navigation links, never an auth callback or an arbitrary URL.
    if (
      [
        "code",
        "access_token",
        "refresh_token",
        "token_hash",
        "recovery",
        "error",
        "delete_account",
      ].some((key) => url.searchParams.has(key))
    )
      return null;
    const query = new URLSearchParams();
    const game = sharedGameId(url.search);
    const profile = sharedProfileId(url.search);
    const candidate = custom
      ? url.searchParams.get("screen")
      : url.hash.slice(1);
    const page = game
      ? "partidas"
      : profile
        ? "amigos"
        : nativeLinkPages.includes(candidate || "")
          ? candidate!
          : "descubrir";
    if (game) query.set("partida", game);
    else if (profile) query.set("golfista", profile);
    if (
      url.hash.includes("=") ||
      (url.searchParams.has("partida") && !game) ||
      (url.searchParams.has("golfista") && !profile)
    )
      return null;
    return "/" + (query.size ? "?" + query : "") + "#" + page;
  } catch {
    return null;
  }
}
export function applyNativeLink(url: string) {
  const route = parseNativeLink(url);
  if (!route) return false;
  window.history.replaceState(null, "", route);
  window.dispatchEvent(new window.Event("popstate"));
  return true;
}
export async function installNativeLinks(
  isCurrent: () => boolean = () => true,
) {
  const { App } = await import("@capacitor/app");
  let opened = false;
  const listener = await App.addListener("appUrlOpen", ({ url }) => {
    opened = true;
    if (isCurrent()) applyNativeLink(url);
  });
  try {
    const initial = await App.getLaunchUrl();
    if (isCurrent() && !opened && initial?.url) applyNativeLink(initial.url);
  } catch {
    /* Opening from the icon has no URL. */
  }
  return () => {
    void listener.remove();
  };
}
