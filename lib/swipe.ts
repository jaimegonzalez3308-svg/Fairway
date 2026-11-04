export type SwipeChoice = "like" | "pass";

/** A short, deliberate drag should work on both phone and desktop cards. */
export function swipeThreshold(width: number) {
  return Math.max(48, Math.min(72, width * 0.16));
}

export function swipeChoice(
  dx: number,
  dy: number,
  width: number,
  elapsedMs: number,
): SwipeChoice | null {
  if (![dx, dy, width, elapsedMs].every(Number.isFinite) || width <= 0)
    return null;
  const distance = Math.abs(dx);
  if (distance <= Math.abs(dy) * 1.25) return null;
  const threshold = swipeThreshold(width);
  const flick = distance >= 36 && distance / Math.max(1, elapsedMs) >= 0.5;
  return distance >= threshold || flick ? (dx > 0 ? "like" : "pass") : null;
}
