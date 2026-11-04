import { NATIVE_RESUME } from "./native-support";

/** A read receipt requires a visible message in the foreground conversation. */
export function observeMessageVisibility(
  element: HTMLElement,
  onVisible: () => void,
) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  let visible = false;
  let disposed = false;
  const check = () => {
    if (!disposed && visible && !document.hidden && document.hasFocus())
      onVisible();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      check();
    },
    { root: element.closest(".chat-messages"), threshold: 0.1 },
  );
  observer.observe(element);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener(NATIVE_RESUME, check);
  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener("visibilitychange", check);
    window.removeEventListener("focus", check);
    window.removeEventListener(NATIVE_RESUME, check);
  };
}
