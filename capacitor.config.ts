import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.fairway.app",
  appName: "Fairway",
  webDir: "out",
  // Plugin responses carry auth credentials and Keychain values.
  ios: { loggingBehavior: "none" },
  plugins: {
    // The bridge is already constrained to the safe area with Auto Layout.
    // Keep its frame stable and move forms above the keyboard using events.
    Keyboard: { resize: KeyboardResize.None },
  },
};

export default config;
