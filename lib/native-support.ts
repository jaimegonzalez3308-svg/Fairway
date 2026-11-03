import type { AppPlugin } from "@capacitor/app";
import type { KeyboardPlugin } from "@capacitor/keyboard";
import type { ScreenReaderPlugin } from "@capacitor/screen-reader";
import type { PluginListenerHandle } from "@capacitor/core";

export const NATIVE_RESUME = "fairway:native-resume";
export const NATIVE_PAUSE = "fairway:native-pause";
export type NativeSupportPlugins = {
  app: Pick<AppPlugin, "addListener">;
  keyboard: Pick<KeyboardPlugin, "addListener">;
  screenReader: Pick<ScreenReaderPlugin, "addListener" | "isEnabled">;
};

export async function loadNativeSupport(): Promise<NativeSupportPlugins> {
  const [{ App }, { Keyboard }, { ScreenReader }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/keyboard"),
    import("@capacitor/screen-reader"),
  ]);
  return { app: App, keyboard: Keyboard, screenReader: ScreenReader };
}

// Register only on installed iOS. Every listener is removed even if setup
// resolves after React unmounts or an optional plugin is unavailable.
export function installNativeSupport(plugins: NativeSupportPlugins) {
  const root = document.documentElement;
  let disposed = false;
  const handles: PluginListenerHandle[] = [];
  const track = async (pending: Promise<PluginListenerHandle>) => {
    try {
      const handle = await pending;
      if (disposed) await handle.remove();
      else handles.push(handle);
    } catch {
      /* The rest of the app remains usable if a plugin is unavailable. */
    }
  };
  const keyboardHeight = (height: number) => {
    if (disposed) return;
    root.style.setProperty(
      "--native-keyboard-height",
      `${Math.max(0, Math.min(height, window.innerHeight))}px`,
    );
    root.classList.toggle("native-keyboard-open", height > 0);
  };
  const readerState = ({ value }: { value: boolean }) => {
    if (!disposed) root.dataset.nativeScreenReader = String(value);
  };
  void track(
    plugins.app.addListener("appStateChange", ({ isActive }) => {
      if (disposed) return;
      root.dataset.nativeActive = String(isActive);
      window.dispatchEvent(
        new window.Event(isActive ? NATIVE_RESUME : NATIVE_PAUSE),
      );
    }),
  );
  void track(
    plugins.keyboard.addListener(
      "keyboardWillShow",
      ({ keyboardHeight: height }) => keyboardHeight(height),
    ),
  );
  void track(
    plugins.keyboard.addListener("keyboardWillHide", () => keyboardHeight(0)),
  );
  void track(
    plugins.keyboard.addListener("keyboardDidShow", () => {
      const active = document.activeElement;
      if (
        !disposed &&
        active instanceof HTMLElement &&
        active.matches("input, textarea, select")
      )
        active.scrollIntoView({ block: "nearest", behavior: "instant" });
    }),
  );
  // Register before reading state so a toggle during startup cannot be missed.
  let readerChanged = false;
  void track(
    plugins.screenReader.addListener("stateChange", (state) => {
      readerChanged = true;
      readerState(state);
    }),
  );
  void plugins.screenReader
    .isEnabled()
    .then((state) => {
      if (!readerChanged) readerState(state);
    })
    .catch(() => {});
  return () => {
    disposed = true;
    for (const handle of handles) void handle.remove().catch(() => {});
    root.style.removeProperty("--native-keyboard-height");
    root.classList.remove("native-keyboard-open");
    delete root.dataset.nativeScreenReader;
    delete root.dataset.nativeActive;
  };
}
