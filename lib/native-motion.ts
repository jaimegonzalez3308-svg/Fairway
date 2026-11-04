/** Restarts a one-shot CSS animation (for example the heart beat on like)
 * by toggling the `beat` class. Styles exist only in the iOS app, so on the
 * website the class does nothing. */
export function beat(element: Element | null) {
  if (!element) return;
  element.classList.remove("beat");
  // Force a reflow so the animation can run again.
  void (element as HTMLElement).offsetWidth;
  element.classList.add("beat");
  const done = () => element.classList.remove("beat");
  element.addEventListener("animationend", done, { once: true });
  setTimeout(done, 700);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
