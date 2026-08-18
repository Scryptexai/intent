"use client";
import { useQuery } from "@tanstack/react-query";

export interface LiveCatalog {
  source: "supabase" | "snapshot";
  projects: { slug: string; name: string; category: string | string[] | null; tier: string | null; era: string | null }[];
  patterns: { id: string; name: string; confidence: string | null; instances: number | null; scope: string | null; analogs: string[]; triggers: string[]; prediction: string | null; watch: string[] }[];
  backtests: { title: string; type: string | null; outcome: string | null; verdict: string | null }[];
  entities: { id: string; name: string | null; type: string | null; projectSlug: string | null; description: string | null }[];
  evidenceCount: number;
  fetchedAt: string;
}

/**
 * Live INTENT catalog via server-side bridge (/api/data/catalog).
 * Service_role key TIDAK pernah menyentuh browser; tanpa key server → snapshot.
 */
export function useCifLive() {
  return useQuery<LiveCatalog>({
    queryKey: ["cif-live"],
    staleTime: 5 * 60_000,
    queryFn: () => fetch("/api/data/catalog").then((r) => r.json()),
  });
}
