import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStore } from "@/lib/store";
import { logger } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Catalog {
  source: "supabase" | "snapshot";
  projects: { slug: string; name: string; category: string | string[] | null; tier: string | null; era: string | null }[];
  patterns: { id: string; name: string; confidence: string | null; instances: number | null; scope: string | null; analogs: string[]; triggers: string[]; prediction: string | null; watch: string[] }[];
  backtests: { title: string; type: string | null; outcome: string | null; verdict: string | null }[];
  entities: { id: string; name: string | null; type: string | null; projectSlug: string | null; description: string | null }[];
  evidenceCount: number;
  fetchedAt: string;
}

const g = globalThis as unknown as { __catalogCache?: { at: number; data: Catalog } };
const TTL = 5 * 60_000;

/**
 * GET /api/data/catalog — locked INTENT data via server-side service_role bridge.
 * Frontend aman pakai anon key; secret tetap di server. Fallback snapshot.
 */
export async function GET() {
  const hit = g.__catalogCache;
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  const sb = supabaseAdmin();
  if (sb) {
    try {
      const [proj, pat, bt, ent, ev] = await Promise.all([
        sb.from("cif_projects").select("*").limit(1000),
        sb.from("cif_patterns").select("*").limit(100),
        sb.from("cif_backtests").select("*").limit(100),
        sb.from("entities").select("*").limit(5000),
        sb.from("evidence_items").select("id", { count: "exact", head: true }),
      ]);
      if (!proj.error) {
        const data: Catalog = {
          source: "supabase",
          projects: (proj.data ?? []).map((r: Record<string, unknown>) => ({
            slug: String(r.id ?? r.slug ?? ""),
            name: String(r.name ?? r.id ?? ""),
            category: (r.category as string[] | string | null) ?? null,
            tier: (r.tier as string | null) ?? null,
            era: (r.era as string | null) ?? null,
          })),
          patterns: (pat.data ?? []).map((r: Record<string, unknown>) => ({
            id: String(r.id ?? ""),
            name: String(r.name ?? r.id ?? ""),
            confidence: (r.confidence as string | null) ?? null,
            instances: (r.instances as number | null) ?? null,
            scope: (r.scope as string | null) ?? null,
            analogs: (r.analogs as string[]) ?? [],
            triggers: (r.triggers as string[]) ?? [],
            prediction: (r.prediction as string | null) ?? null,
            watch: (r.watch as string[]) ?? [],
          })),
          backtests: (bt.data ?? []).map((r: Record<string, unknown>) => ({
            title: String(r.title ?? r.id ?? ""),
            type: (r.type as string | null) ?? null,
            outcome: (r.outcome as string | null) ?? null,
            verdict: (r.verdict as string | null) ?? null,
          })),
          entities: (ent.data ?? []).map((r: Record<string, unknown>) => ({
            id: String(r.id ?? ""),
            name: (r.name as string | null) ?? null,
            type: (r.type as string | null) ?? null,
            projectSlug: ((r.projectSlug as string | null) ?? (r.project_slug as string | null)) ?? null,
            description: typeof r.description === "string" ? r.description.slice(0, 220) : null,
          })),
          evidenceCount: ev.count ?? 0,
          fetchedAt: new Date().toISOString(),
        };
        g.__catalogCache = { at: Date.now(), data };
        logger.info("data", "catalog served from supabase (service_role bridge)", { projects: data.projects.length, entities: data.entities.length });
        return NextResponse.json(data);
      }
      logger.warn("data", "supabase query failed → snapshot", { err: proj.error?.message });
    } catch (e) {
      logger.warn("data", "supabase unreachable → snapshot", { err: String(e) });
    }
  }

  // Fallback snapshot vendored (cif-export/1)
  const s = getStore();
  const data: Catalog = {
    source: "snapshot",
    projects: (s.cif?.projects ?? []).map((p) => ({ slug: p.n.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: p.n, category: p.cat, tier: p.tier, era: p.era })),
    patterns: (s.cif?.patterns ?? []).map((p) => ({
      id: p.id, name: p.nm, confidence: p.confidence, instances: p.instances, scope: p.scope, analogs: p.analogs ?? [], triggers: p.triggers ?? [], prediction: p.pred, watch: p.watch ?? [],
    })),
    backtests: (s.cif && "benchmarks" in (s.cif as object) ? ((s.cif as unknown as { benchmarks?: { title: string; type: string; outcome: string; verdict?: string }[] }).benchmarks ?? []) : []).map((b) => ({ title: b.title, type: b.type, outcome: b.outcome, verdict: b.verdict ?? null })),
    entities: Object.entries(s.cif?.entities ?? {}).flatMap(([project, list]) =>
      list.map((e) => ({ id: e.id, name: e.name, type: e.type, projectSlug: project.toLowerCase(), description: (e.description ?? "").slice(0, 220) })),
    ),
    evidenceCount: 0,
    fetchedAt: new Date().toISOString(),
  };
  g.__catalogCache = { at: Date.now(), data };
  return NextResponse.json(data);
}
