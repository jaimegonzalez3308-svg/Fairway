export type SwipeChoice = "like" | "pass";
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
  const threshold = Math.max(72, Math.min(120, width * 0.27));
  const flick = distance >= 48 && distance / Math.max(1, elapsedMs) >= 0.65;
  return distance >= threshold || flick ? (dx > 0 ? "like" : "pass") : null;
}
