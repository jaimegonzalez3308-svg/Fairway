export const NATIVE_NETWORK_CHANGED = "fairway:network-changed";
export function nativeOnline() {
  return (
    typeof document === "undefined" ||
    (document.documentElement.dataset.nativeOnline !== "false" &&
      navigator.onLine !== false)
  );
}
export async function installNativeNetwork(
  isCurrent: () => boolean = () => true,
) {
  const { Network } = await import("@capacitor/network");
  const update = ({ connected }: { connected: boolean }) => {
    if (!isCurrent()) return;
    document.documentElement.dataset.nativeOnline = String(connected);
    window.dispatchEvent(new Event(NATIVE_NETWORK_CHANGED));
  };
  let changed = false;
  const listener = await Network.addListener("networkStatusChange", (state) => {
    changed = true;
    update(state);
  });
  try {
    const status = await Network.getStatus();
    if (!changed) update(status);
  } catch {
    /* Browser online/offline events remain a fallback. */
  }
  return () => {
    void listener.remove();
    delete document.documentElement.dataset.nativeOnline;
  };
}
