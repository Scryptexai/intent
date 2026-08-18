"use client";
import { useEffect, useState } from "react";

/**
 * Breakpoint hook — komponen menyediakan 2 layout: desktop (dense multi-panel)
 * dan mobile (stacked, bottom-nav, segmented). SSR default desktop.
 */
export function useIsMobile(bp = 768): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [bp]);
  return mobile;
}
