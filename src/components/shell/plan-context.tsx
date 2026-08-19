"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface PlanState {
  plan: "free" | "pro" | "ultimate";
  loading: boolean;
  setPlan: (p: "free" | "pro" | "ultimate") => Promise<void>;
}

const Ctx = createContext<PlanState>({ plan: "free", loading: false, setPlan: async () => {} });

export function PlanProvider({ children }: { children: ReactNode }) {
  // SSR-safe: render the (demo-default) free surface immediately so fetched HTML
  // carries real content; the effect below reconciles with the server's plan.
  const [plan, setPlanState] = useState<"free" | "pro" | "ultimate">("free");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => setPlanState(d.user?.plan ?? "free"))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setPlan = useCallback(async (p: "free" | "pro" | "ultimate") => {
    const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
    const d = await res.json();
    setPlanState(d.user?.plan ?? p);
  }, []);

  return <Ctx.Provider value={{ plan, loading, setPlan }}>{children}</Ctx.Provider>;
}

export const usePlan = () => useContext(Ctx);
