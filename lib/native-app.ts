import type { CapacitorGlobal } from "@capacitor/core";

export function nativeBridge() {
  return typeof window === "undefined"
    ? undefined
    : (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
}

// A narrow screen or an iPhone browser is still the website.
export function isIOSApp(bridge?: Pick<CapacitorGlobal, "getPlatform">) {
  return bridge?.getPlatform() === "ios";
}
