"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  role: "viewer" | "analyst" | "admin";
  plan: "free" | "pro" | "ultimate";
}

export function useSession() {
  return useQuery<{ user: SessionUser | null }>({
    queryKey: ["session"],
    staleTime: 60_000,
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });
}

export function useInvalidateSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["session"] });
}

/** Dispatch to bounce the user to /login (listened by AppShell). */
export function emitUnauthorized() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("cif:unauthorized"));
}
