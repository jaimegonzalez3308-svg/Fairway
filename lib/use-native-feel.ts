"use client";
import { useEffect, useRef, type RefObject } from "react";

const HIDDEN_CLASS = "native-header-hidden";

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Decides whether the slim app header should hide: hide while moving down
 * past the header, show again on any meaningful move up or near the top. */
export function headerShouldHide(
  previousY: number,
  y: number,
  hidden: boolean,
  threshold = 72,
) {
  if (y <= threshold) return false;
  const delta = y - previousY;
  if (delta > 6) return true;
  if (delta < -6) return false;
  return hidden;
}

/** iOS app only: the header slides away while scrolling down a screen and
 * returns when scrolling up, like a social feed. */
export function useHideHeaderOnScroll(enabled: boolean, resetKey: string) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(HIDDEN_CLASS);
    if (!enabled) return;
    let last = window.scrollY;
    let hidden = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      // VoiceOver and keyboard users keep the header in place.
      const keep =
        root.dataset.nativeScreenReader === "true" ||
        !!document.activeElement?.closest(".topbar");
      const next = keep ? false : headerShouldHide(last, y, hidden);
      last = y;
      if (next !== hidden) {
        hidden = next;
        root.classList.toggle(HIDDEN_CLASS, hidden);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Keyboard and switch users bring the header back by focusing it.
    const onFocus = (event: FocusEvent) => {
      if (!hidden || !(event.target as Element | null)?.closest?.(".topbar"))
        return;
      hidden = false;
      root.classList.remove(HIDDEN_CLASS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove(HIDDEN_CLASS);
    };
  }, [enabled, resetKey]);
}

export type PageMotion = "forward" | "back" | "tab" | null;

/** Secondary screens slide in from the right, returning to a tab slides back
 * from the left, and switching tabs is a short fade. */
export function pageMotion(
  from: string,
  to: string,
  primary: string[],
): PageMotion {
  if (from === to) return null;
  const fromPrimary = primary.includes(from);
  const toPrimary = primary.includes(to);
  if (!toPrimary) return "forward";
  if (!fromPrimary) return "back";
  return "tab";
}

export function usePageTransition(
  enabled: boolean,
  page: string,
  primary: string[],
  target: RefObject<HTMLElement | null>,
) {
  const previous = useRef(page);
  useEffect(() => {
    const from = previous.current;
    previous.current = page;
    const element = target.current;
    if (!enabled || !element || reducedMotion() || !element.animate) return;
    const motion = pageMotion(from, page, primary);
    if (!motion) return;
    const frames =
      motion === "tab"
        ? [{ opacity: 0.4 }, { opacity: 1 }]
        : [
            {
              transform: `translateX(${motion === "forward" ? 28 : -28}px)`,
              opacity: 0.35,
            },
            { transform: "none", opacity: 1 },
          ];
    element.animate(frames, {
      duration: motion === "tab" ? 150 : 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
    // primary is a stable list of page ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page]);
}

/** Pull a bottom sheet down from its top to close it. Only starts when the
 * sheet is scrolled to the top and the finger moves mostly downward. */
export function useSheetDrag(
  enabled: boolean,
  element: HTMLElement | null,
  onClose: () => void,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!enabled || !element) return;
    // Every scrolling box between the finger and the sheet must be at its top.
    const atTop = (target: Element | null) => {
      for (
        let node: Element | null = target;
        node && node !== element.parentElement;
        node = node.parentElement
      )
        if (node.scrollTop > 0) return false;
      return true;
    };
    let start: { x: number; y: number } | null = null;
    let dragging = false;
    let offset = 0;
    // The app's sheets are centred with translateX(-50%) (native-app.css).
    const prefix = "translateX(-50%) ";
    const reset = () => {
      element.style.transition = reducedMotion()
        ? ""
        : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)";
      element.style.transform = "";
      dragging = false;
      offset = 0;
    };
    const begin = (event: TouchEvent) => {
      const target = event.target as Element | null;
      start = null;
      if (
        event.touches.length !== 1 ||
        !atTop(target) ||
        target?.closest("input,textarea,select,[data-no-gestures]") ||
        document.documentElement.dataset.nativeScreenReader === "true"
      )
        return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const move = (event: TouchEvent) => {
      if (!start) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (!dragging) {
        if (dy > 10 && Math.abs(dx) < dy * 0.6) dragging = true;
        else if (Math.abs(dx) > 10 || dy < -10) {
          start = null;
          return;
        } else return;
      }
      if (event.cancelable) event.preventDefault();
      offset = Math.max(0, dy);
      element.style.transition = "none";
      element.style.transform = `${prefix}translateY(${offset}px)`;
    };
    const finish = () => {
      const shouldClose = dragging && offset > 110;
      start = null;
      if (shouldClose) {
        element.style.transform = "";
        dragging = false;
        close.current();
      } else if (dragging) reset();
    };
    element.addEventListener("touchstart", begin, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", finish);
    element.addEventListener("touchcancel", reset);
    return () => {
      element.removeEventListener("touchstart", begin);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", finish);
      element.removeEventListener("touchcancel", reset);
    };
  }, [enabled, element]);
}
