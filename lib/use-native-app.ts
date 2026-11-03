"use client";
import { useEffect, useState } from "react";
import type { CapacitorGlobal } from "@capacitor/core";
import { isIOSApp } from "./native-app";

export function useNativeApp() {
  const [native, setNative] = useState(false);
  useEffect(() => {
    const bridge = (window as Window & { Capacitor?: CapacitorGlobal })
      .Capacitor;
    const ios = isIOSApp(bridge);
    setNative(ios);
    if (!ios) return;
    document.documentElement.classList.add("native-ios");
    let disposed = false;
    let stopSupport: (() => void) | undefined;
    let stopNetwork: (() => void) | undefined;
    let stopLinks: (() => void) | undefined;
    void import("./native-links")
      .then(async ({ installNativeLinks }) => {
        const cleanup = await installNativeLinks(() => !disposed);
        if (disposed) cleanup();
        else stopLinks = cleanup;
      })
      .catch(() => {});
    void import("./native-network")
      .then(async ({ installNativeNetwork }) => {
        const cleanup = await installNativeNetwork(() => !disposed);
        if (disposed) cleanup();
        else stopNetwork = cleanup;
      })
      .catch(() => {});
    void import("./native-support")
      .then(async ({ loadNativeSupport, installNativeSupport }) => {
        const plugins = await loadNativeSupport();
        if (!disposed) stopSupport = installNativeSupport(plugins);
      })
      .catch(() => {});
    const viewport = window.visualViewport;
    const updateKeyboard = () => {
      document.documentElement.classList.toggle(
        "native-keyboard-open",
        Number.parseFloat(
          document.documentElement.style.getPropertyValue(
            "--native-keyboard-height",
          ),
        ) > 0 ||
          (!!viewport && window.innerHeight - viewport.height > 140),
      );
    };
    updateKeyboard();
    viewport?.addEventListener("resize", updateKeyboard);
    return () => {
      disposed = true;
      stopSupport?.();
      stopNetwork?.();
      stopLinks?.();
      viewport?.removeEventListener("resize", updateKeyboard);
      document.documentElement.classList.remove(
        "native-ios",
        "native-keyboard-open",
      );
    };
  }, []);
  return native;
}
