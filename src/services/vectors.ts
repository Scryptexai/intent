import { CATEGORIES, type SeedData } from "@/lib/data/seed";
import type { ProjectRow } from "@/lib/domain";
import { hashSeed, mulberry32 } from "@/lib/prng";

/**
 * ── services/vectors ───────────────────────────────────────────────────────
 * Pure feature-vector math for The Mirror. Vectors are persisted per project
 * into the `feature_vectors` table (see store init) and reused by the
 * similarity engine so scans stay O(n) dot-products.
 *
 * Dimensions (weighted): category one-hot ×3 · fundamentals ×1 ·
 * pattern activations ×1.5 · knowledge tag histogram ×1.2.
 */

export const TAG_POOL = ["tokenomics", "tvl", "governance", "risk", "flows", "social", "dev-activity", "airdrop", "unlock", "fees"] as const;

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function logScale(n: number): number {
  return Math.log10(Math.max(1, n)) / 11;
}

/** Heuristic 16-pattern activation derived from observable metrics. */
export function patternActivations(data: Pick<SeedData, "patterns">, p: ProjectRow): number[] {
  const patterns = data.patterns;
  const ageDays = Math.max(30, (Date.UTC(2026, 7, 10) - new Date(p.launchDate).getTime()) / 86400000);
  const volTvl = p.volume24hUsd / Math.max(1, p.tvlUsd);
  const series = p.series;
  const last = series[series.length - 1] ?? { tvl: Math.max(1, p.tvlUsd), volume: Math.max(1, p.volume24hUsd), sentiment: p.sentiment };
  const first = series[0] ?? last;
  const tvlGrowth = last.tvl / Math.max(1, first.tvl) - 1;
  const sentDelta = last.sentiment - first.sentiment;

  const act: number[] = new Array(patterns.length).fill(0);
  const idx = Object.fromEntries(patterns.map((pt, i) => [pt.slug, i]));

  act[idx["narrative-momentum"]] = Math.max(0, Math.min(1, sentDelta * 1.6 + (tvlGrowth > 0.15 ? 0.3 : 0)));
  act[idx["retail-euphoria-top"]] = Math.max(0, Math.min(1, last.sentiment * 0.9 + volTvl * 0.15));
  act[idx["whale-accumulation"]] = volTvl < 0.12 && Math.abs(sentDelta) < 0.15 ? 0.6 : 0.1;
  act[idx["points-frenzy"]] = p.category === "Restaking" || p.category === "Yield" ? 0.55 : 0.2;
  act[idx["restaking-flywheel"]] = p.category === "Restaking" ? 0.85 : p.category === "Yield" ? 0.5 : 0.05;
  act[idx["tvl-inflation-loop"]] = p.category === "Yield" || p.category === "Lending" ? 0.45 : 0.1;
  act[idx["mercenary-liquidity"]] = tvlGrowth < -0.05 ? 0.7 : 0.15;
  act[idx["airdrop-farm-rotation"]] = ageDays < 400 && volTvl > 0.3 ? 0.65 : 0.2;
  act[idx["vesting-cliff-dump"]] = ageDays > 200 && ageDays < 1200 ? 0.5 : 0.15;
  act[idx["unlock-overhang"]] = ageDays > 300 ? 0.45 : 0.1;
  act[idx["low-float-high-fdv"]] = ageDays < 300 ? 0.6 : 0.1;
  act[idx["ecosystem-grant-pump"]] = p.category === "L1" || p.category === "L2" ? 0.4 : 0.1;
  act[idx["bridge-exploit-recovery"]] = p.category === "Bridge" ? 0.5 : 0.02;
  act[idx["governance-capture"]] = ageDays > 1000 ? 0.35 : 0.05;
  act[idx["oracle-manipulation"]] = p.category === "Oracles" ? 0.25 : 0.03;
  act[idx["insider-front-running"]] = ageDays < 120 ? 0.5 : 0.05;
  return act.map((v) => Math.round(v * 100) / 100);
}

/** Knowledge-corpus tag histogram (sqrt-damped). */
export function knowledgeTags(data: Pick<SeedData, "knowledge">, projectId: string): number[] {
  const counts = new Array(TAG_POOL.length).fill(0);
  for (const k of data.knowledge) {
    if (k.projectId !== projectId) continue;
    for (const t of k.tags ?? []) {
      const i = TAG_POOL.indexOf(t as (typeof TAG_POOL)[number]);
      if (i >= 0) counts[i] += 1;
    }
  }
  const max = Math.max(1, ...counts);
  return counts.map((c) => Math.sqrt(c / max));
}

export function buildFeatureVector(data: Pick<SeedData, "patterns" | "knowledge">, p: ProjectRow): number[] {
  const cat = CATEGORIES.map((c) => (c === p.category ? 3 : 0));
  const series = p.series;
  const last = series[series.length - 1] ?? { tvl: p.tvlUsd, volume: p.volume24hUsd, sentiment: p.sentiment };
  const fundamentals = [
    logScale(last.tvl),
    logScale(last.volume),
    Math.min(1, Math.max(0, (last.sentiment + 1) / 2)),
    Math.min(1, p.volume24hUsd / Math.max(1, p.tvlUsd) / 2),
    Math.min(1, (Date.UTC(2026, 7, 10) - new Date(p.launchDate).getTime()) / 86400000 / 2500),
  ];
  const patterns = patternActivations(data, p).map((v) => v * 1.5);
  const tags = knowledgeTags(data, p.id).map((v) => v * 1.2);
  return [...cat, ...fundamentals, ...patterns, ...tags];
}

/** Persist vectors for every project into SeedData.featureVectors (incremental, idempotent). */
export function ensureFeatureVectors(data: SeedData): void {
  for (const p of data.projects) {
    if (!data.featureVectors.has(p.id)) data.featureVectors.set(p.id, buildFeatureVector(data, p));
  }
}

/** Deterministic jitter used by the 24h Truth-Matrix refresh. */
export function seededJitter(key: string, amp: number): number {
  const r = mulberry32(hashSeed(key))();
  return (r - 0.5) * 2 * amp;
}
