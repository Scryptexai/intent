"use client";
import { useEffect, useState } from "react";

/**
 * Discovery A/B framing (docs/PRODUCT-DIRECTION.md §Uji framing):
 * A = "Make confident decisions." · B = "Make decisions you can defend."
 * Assignment deterministik per visitor (hash uid lokal), terekspos via
 * /api/track (framing_expose) dan masuk funnel /api/metrics (admin).
 */
export type FramingVariant = "A" | "B";

export function framingAssignment(): FramingVariant {
  if (typeof window === "undefined") return "B";
  try {
    let id = localStorage.getItem("intent-ab-uid");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("intent-ab-uid", id);
    }
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 2 === 0 ? "A" : "B";
  } catch {
    return "B";
  }
}

export function track(event: string, meta?: Record<string, unknown>) {
  fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, meta }) }).catch(() => {});
}

/** Hook framing: assignment stabil + exposure event 1× per sesi per variant. */
export function useFraming(): FramingVariant {
  const [v] = useState<FramingVariant>(() => framingAssignment());
  useEffect(() => {
    try {
      const key = `intent-framing-exposed-${v}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track("framing_expose", { variant: v });
      }
    } catch {}
  }, [v]);
  return v;
}
