import { site } from "./site";

// WKWebView's capacitor:// origin can serialize as "null". Shared links must
// open the public website; browser builds keep their own deployment origin.
export function publicOrigin(origin: string): string {
  if (origin === "null" || origin.startsWith("capacitor://"))
    return new URL(site.url).origin;
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("No hay una dirección pública disponible.");
  return url.origin;
}
