"use client";
import { useEffect, useRef, useState } from "react";
import { nativeHaptic } from "./native-device";
import { nativeOnline } from "./native-network";

export function gestureIntent(
  dx: number,
  dy: number,
  edge: boolean,
  top: boolean,
) {
  if (edge && dx > 72 && Math.abs(dy) < dx * 0.45) return "back";
  if (top && dy > 76 && Math.abs(dx) < dy * 0.4) return "refresh";
  return null;
}
export function useNativeShell({
  enabled,
  canBack,
  blocked,
  onBack,
  onRefresh,
}: {
  enabled: boolean;
  canBack: boolean;
  blocked: boolean;
  onBack: () => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const refreshingRef = useRef(false);
  const latest = useRef({ canBack, blocked, onBack, onRefresh });
  latest.current = { canBack, blocked, onBack, onRefresh };
  const refresh = async () => {
    if (refreshingRef.current || !nativeOnline()) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await latest.current.onRefresh();
      nativeHaptic();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  };
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; edge: boolean; top: boolean } | null =
      null;
    const begin = (event: TouchEvent) => {
      start = null;
      const state = latest.current;
      const target = event.target;
      if (
        event.touches.length !== 1 ||
        !(target instanceof Element) ||
        target.closest(
          'input,textarea,select,button,a,[role="slider"],[data-no-gestures]',
        ) ||
        document.documentElement.dataset.nativeScreenReader === "true"
      )
        return;
      const touch = event.touches[0];
      const dialog = target.closest('[role="dialog"]');
      let nestedScroll = false;
      for (
        let parent = target.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        if (
          parent.scrollHeight > parent.clientHeight + 4 &&
          /auto|scroll/.test(getComputedStyle(parent).overflowY)
        ) {
          nestedScroll = true;
          break;
        }
      }
      start = {
        x: touch.clientX,
        y: touch.clientY,
        edge: touch.clientX <= 24 && (state.canBack || !!dialog),
        top: !state.blocked && !dialog && !nestedScroll && window.scrollY <= 0,
      };
    };
    const move = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (start.top && dy > 12 && Math.abs(dx) < dy * 0.4) {
        if (event.cancelable) event.preventDefault();
        setPull(Math.min(96, dy));
      }
    };
    const finish = (event: TouchEvent) => {
      const first = start;
      start = null;
      setPull(0);
      if (!first || !event.changedTouches.length) return;
      const intent = gestureIntent(
        event.changedTouches[0].clientX - first.x,
        event.changedTouches[0].clientY - first.y,
        first.edge,
        first.top,
      );
      if (intent === "back") {
        const back = document.querySelector<HTMLButtonElement>(
          '[role="dialog"][data-state="open"] [data-native-back]',
        );
        if (back) back.click();
        else if (!latest.current.blocked && latest.current.canBack)
          latest.current.onBack();
      }
      if (intent === "refresh") void refreshRef.current();
    };
    const cancel = () => {
      start = null;
      setPull(0);
    };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", finish);
    document.addEventListener("touchcancel", cancel);
    return () => {
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", cancel);
    };
  }, [enabled]);
  return { refresh, refreshing, pull };
}
