import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SeedData } from "@/lib/data/seed";
import { makeSeries } from "@/lib/data/seed";
import { hashSeed, mulberry32, range } from "@/lib/prng";
import type { CifDataset, CifStats } from "@/lib/cif/types";
import { SUPABASE_DEFAULTS } from "@/lib/supabase/defaults";
import { logger } from "@/services/logger";

/**
 * ── CIF LOCKED-DATASET LOADER ───────────────────────────────────────────────
 * Reads the vendored `cif-export/1` snapshots (src/data/cif/*.json — the
 * locked schema from the CIF source-of-truth repo) and merges them into the
 * app store. The product blueprint is still fluid; this data shape is locked,
 * so the app adapts to it.
 */

const DIR = path.join(process.cwd(), "src", "data", "cif");

const g = globalThis as unknown as {
  __cifDataset?: CifDataset;
  __cifMerged?: boolean;
  __sbReachable?: { reachable: boolean; at: number };
};

/**
 * Server-side Supabase reachability probe (cached, 10-min negative cache).
 * In restricted egress environments (like the build sandbox) this fails fast
 * and the app serves the vendored snapshot; in open deployments it reports
 * the live bridge as active.
 */
export async function supabaseServerStatus(): Promise<{ configured: boolean; reachable: boolean; url: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_DEFAULTS.url || null;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    SUPABASE_DEFAULTS.publishableKey ||
    null;
  if (!url || !key) return { configured: false, reachable: false, url };
  const now = Date.now();
  if (g.__sbReachable && now - g.__sbReachable.at < 10 * 60_000) {
    return { configured: true, reachable: g.__sbReachable.reachable, url };
  }
  let reachable = false;
  try {
    const res = await fetch(`${url}/rest/v1/cif_patterns?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3500),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  g.__sbReachable = { reachable, at: now };
  return { configured: true, reachable, url };
}

async function readJson<T>(file: string): Promise<T> {
  const buf = await readFile(path.join(DIR, file), "utf8");
  return JSON.parse(buf) as T;
}

export async function getCifDataset(): Promise<CifDataset> {
  if (g.__cifDataset) return g.__cifDataset;
  const [cif, decisionEvents, entities, knowledge, events, patterns, conflicts, qa, behavior, benchmarks] =
    await Promise.all([
      readJson<{ meta: CifDataset["meta"]; projects: CifDataset["projects"] }>("cif.json"),
      readJson<CifDataset["decisionEvents"]>("decision_events.json"),
      readJson<CifDataset["entities"]>("entities.json"),
      readJson<CifDataset["knowledge"]>("knowledge.json"),
      readJson<CifDataset["events"]>("events.json"),
      readJson<CifDataset["patterns"]>("patterns.json"),
      readJson<CifDataset["conflicts"]>("conflicts.json"),
      readJson<CifDataset["qa"]>("qa.json"),
      readJson<CifDataset["behavior"]>("behavior.json"),
      readJson<CifDataset["benchmarks"]>("benchmarks.json"),
    ]);
  g.__cifDataset = {
    meta: cif.meta,
    projects: cif.projects,
    decisionEvents,
    entities,
    knowledge,
    events,
    patterns,
    conflicts,
    qa,
    behavior,
    benchmarks,
  };
  logger.info("cif", "dataset loaded", { projects: cif.projects.length, patterns: patterns.length });
  return g.__cifDataset;
}

export function cifStats(d: CifDataset): CifStats {
  const count = (r: Record<string, unknown[]>) => Object.values(r).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
  return {
    schema: d.meta.schema,
    generated: d.meta.generated,
    projects: d.projects.length,
    decisionEvents: count(d.decisionEvents as never),
    entities: count(d.entities as never),
    knowledge: count(d.knowledge as never),
    timelineEvents: count(d.events as never),
    patterns: d.patterns.length,
    conflicts: count(d.conflicts as never),
    qaScored: Object.keys(d.qa).length,
    benchmarks: d.benchmarks.length,
  };
}

function slugify(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Resolve the dataset key (display name) for a project slug/name. */
export function cifKeyFor(d: CifDataset, slugOrName: string): string | null {
  const s = slugOrName.toLowerCase();
  for (const p of d.projects) {
    if (p.n.toLowerCase() === slugOrName.toLowerCase() || slugify(p.n) === s) return p.n;
  }
  return null;
}

export interface CifProjectDossier {
  project: CifDataset["projects"][number];
  qa: CifDataset["qa"][string] | null;
  decisionEvents: CifDataset["decisionEvents"][string] | null;
  entities: CifDataset["entities"][string] | null;
  knowledge: CifDataset["knowledge"][string] | null;
  timeline: CifDataset["events"][string] | null;
  conflicts: CifDataset["conflicts"][string] | null;
  behavior: CifDataset["behavior"][string] | null;
  firedPatterns: CifDataset["patterns"];
}

export function cifDossier(d: CifDataset, slugOrName: string): CifProjectDossier | null {
  const key = cifKeyFor(d, slugOrName);
  if (!key) return null;
  const project = d.projects.find((p) => p.n === key)!;
  return {
    project,
    qa: d.qa[key] ?? null,
    decisionEvents: d.decisionEvents[key] ?? null,
    entities: d.entities[key] ?? null,
    knowledge: d.knowledge[key] ?? null,
    timeline: d.events[key] ?? null,
    conflicts: d.conflicts[key] ?? null,
    behavior: d.behavior[key] ?? null,
    firedPatterns: d.patterns.filter((p) => p.analogs.some((a) => a.toLowerCase() === key.toLowerCase())),
  };
}

/**
 * Merge the locked catalog into the app store (idempotent):
 *  - existing synthetic rows get linked (slug match),
 *  - unseen CIF projects are added as accessible hero rows,
 *  - the full dataset is attached as store.cif.
 */
export async function mergeCifIntoStore(s: SeedData): Promise<{ added: number; linked: number }> {
  const d = await getCifDataset();
  s.cif = d;
  if (g.__cifMerged) {
    return { added: 0, linked: 0 };
  }
  g.__cifMerged = true;

  let added = 0;
  let linked = 0;
  for (const p of d.projects) {
    const slug = slugify(p.n);
    const existing = s.projects.find((x) => x.slug === slug || x.name.toLowerCase() === p.n.toLowerCase());
    if (existing) {
      s.cifLinks.set(existing.slug, p.n);
      linked++;
    } else {
      const rnd = mulberry32(hashSeed(`cif:${slug}`));
      const row = {
        id: `p-${slug}`,
        slug,
        name: p.n,
        category: p.cat.split("(")[0].trim(),
        description: `${p.cat} · era ${p.era} · INTENT tier ${p.tier}`,
        tvlUsd: Math.round(range(rnd, 40, 2400) * 1_000_000),
        volume24hUsd: Math.round(range(rnd, 10, 900) * 1_000_000),
        sentiment: Math.round(range(rnd, -0.3, 0.5) * 100) / 100,
        launchDate: "2020-01-01",
        tokenSymbol: null,
        isDemo: true, // real INTENT catalog is browsable on every tier
        hero: true,
        series: makeSeries(rnd, Math.round(range(rnd, 40, 2400) * 1_000_000), Math.round(range(rnd, 10, 900) * 1_000_000), 0.1),
      };
      s.projects.push(row);
      s.cifLinks.set(slug, p.n);
      added++;
    }
  }
  logger.info("cif", "merged into store", { added, linked, total: s.projects.length });
  return { added, linked };
}
