import { registerPlugin } from "@capacitor/core";
import { isIOSApp, nativeBridge } from "./native-app";

export type NativeDeviceStatus = {
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricName: string;
  pushConfigured: boolean;
  pushEnvironment: "sandbox" | "production";
  pushStatus: "notDetermined" | "denied" | "authorized" | "provisional";
};
export const NativeDevice = registerPlugin<{
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  clearPrivateData(): Promise<void>;
  status(): Promise<NativeDeviceStatus>;
  setBiometricEnabled(options: { enabled: boolean }): Promise<void>;
  haptic(): Promise<void>;
  setBadge(options: { count: number }): Promise<void>;
  openSettings(): Promise<void>;
}>("FairwayDevice");

type Vault = Pick<typeof NativeDevice, "get" | "set" | "remove">;
export function createSecureStorage(
  vault: Vault,
  legacy: Pick<Storage, "getItem" | "removeItem">,
) {
  return {
    async getItem(key: string) {
      const { value } = await vault.get({ key });
      // One-time migration: write the former session to Keychain before removing it.
      if (value !== null) {
        legacy.removeItem(key);
        return value;
      }
      const previous = legacy.getItem(key);
      if (previous !== null) {
        await vault.set({ key, value: previous });
        legacy.removeItem(key);
      }
      return previous;
    },
    async setItem(key: string, value: string) {
      await vault.set({ key, value });
      legacy.removeItem(key);
    },
    async removeItem(key: string) {
      await vault.remove({ key });
      legacy.removeItem(key);
    },
  };
}
export const nativeSecureStorage = createSecureStorage(NativeDevice, {
  getItem: (key) => window.localStorage.getItem(key),
  removeItem: (key) => window.localStorage.removeItem(key),
});

export function nativeHaptic() {
  if (isIOSApp(nativeBridge())) void NativeDevice.haptic().catch(() => {});
}
