/** Muted story authors, kept only on this device for the signed-in viewer.
 * Muting hides someone's stories from the rail; it is not a block. */
const key = (viewerId: string) => `fairway.story-muted.v1:${viewerId}`;

export function readMuted(viewerId?: string | null): string[] {
  if (!viewerId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(key(viewerId)) || "[]");
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeMuted(viewerId: string, ids: string[]) {
  try {
    localStorage.setItem(key(viewerId), JSON.stringify([...new Set(ids)]));
  } catch {
    /* Muting stays for this visit only. */
  }
}
