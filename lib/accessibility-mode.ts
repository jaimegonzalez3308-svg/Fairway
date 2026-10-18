export const ACCESSIBILITY_STORAGE_KEY = "fairway:accessibility-mode";

export function readAccessibilityMode(
  storage: Pick<Storage, "getItem">,
): boolean {
  try {
    return storage.getItem(ACCESSIBILITY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveAccessibilityMode(
  storage: Pick<Storage, "setItem">,
  enabled: boolean,
): void {
  try {
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, String(enabled));
  } catch {
    /* The current page still works when browser storage is unavailable. */
  }
}

// Only a fixed preference key is interpolated; no user content enters this script.
export const ACCESSIBILITY_BOOTSTRAP = `try{document.documentElement.dataset.accessibility=localStorage.getItem(${JSON.stringify(ACCESSIBILITY_STORAGE_KEY)})==="true"?"true":"false"}catch{}`;
