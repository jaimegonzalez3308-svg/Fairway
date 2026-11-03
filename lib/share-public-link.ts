import { isIOSApp, nativeBridge } from "./native-app";

export function canSharePublicLink() {
  return (
    isIOSApp(nativeBridge()) ||
    (typeof navigator !== "undefined" && typeof navigator.share === "function")
  );
}

export async function sharePublicLink(data: {
  title: string;
  url: string;
  text?: string;
}) {
  const url = new URL(data.url);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Enlace no disponible para compartir.");
  if (isIOSApp(nativeBridge())) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ ...data, url: url.href });
  } else await navigator.share(data);
}
