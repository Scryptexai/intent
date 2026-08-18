import { getStore, isProjectAccessible } from "@/lib/store";
import { getActorCredibility } from "@/services/actor-credibility";
import { patternActivations } from "@/services/vectors";
import { hashSeed } from "@/lib/prng";
import { logger, ServiceError } from "@/services/logger";

/**
 * ── PROJECT DETAIL · deep-dive aggregator for /project/[slug] ─────────────
 */

export interface ProjectDetail {
  project: {
    id: string; slug: string; name: string; category: string; description: string;
    tvlUsd: number; volume24hUsd: number; sentiment: number; launchDate: string;
    tokenSymbol: string | null; hero: boolean; locked: boolean;
    tvl30dPct: number; volume30dPct: number;
  };
  series: { t: string; tvl: number; volume: number; sentiment: number }[];
  cifScore: number;
  knowledge: { total: number; bySource: Record<string, number>; top: { statement: string; source: string; confidence: number; author?: string }[] };
  events: { id: string; title: string; kind: string; occurredAt: string; probability: number }[];
  actors: { id: string; name: string; kind: string; reliability: number; reason: string }[];
  signals: { id: string; type: string; strength: number; payload: Record<string, unknown>; detectedAt: string }[];
  pov: { segment: string; allocation_pct: number; sold_7d_pct: number; holding_pct: number }[];
  airdrop: { token: string; dropped_usd: number; claimants: number; sell_pressure_7d_pct: number } | null;
  activePatterns: { name: string; activation: number }[];
}

export function getProjectDetail(slug: string): ProjectDetail {
  const s = getStore();
  const project = s.projects.find((p) => p.slug === slug || p.id === slug);
  if (!project) throw new ServiceError("PROJECT_NOT_FOUND", `No project '${slug}'`, 404);

  const ser = project.series.slice(-30);
  const tvl30dPct = Math.round((ser[ser.length - 1].tvl / ser[0].tvl - 1) * 1000) / 10;
  const volume30dPct = Math.round((ser[ser.length - 1].volume / ser[0].volume - 1) * 1000) / 10;

  const ks = s.knowledge.filter((k) => k.projectId === project.id);
  const bySource: Record<string, number> = {};
  for (const k of ks) bySource[k.source] = (bySource[k.source] ?? 0) + 1;

  // Intent Score: sentiment + momentum + knowledge confidence blend, 0..100
  const avgConf = ks.length ? ks.reduce((a, k) => a + k.confidence, 0) / ks.length : 0.5;
  const cifScore = Math.max(5, Math.min(95, Math.round(50 + project.sentiment * 25 + Math.max(-20, Math.min(20, tvl30dPct / 2)) + (avgConf - 0.5) * 20)));

  // Actors involved: disclosed conflicts naming the project, else deterministic association
  const firstWord = project.name.split(" ")[0].toLowerCase();
  const actors = s.entities
    .filter((e) => e.conflicts.some((c) => c.toLowerCase().includes(firstWord)) || hashSeed(project.id + e.id) % 5 === 0)
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      name: e.name,
      kind: e.kind,
      reliability: getActorCredibility(e.id).reliability,
      reason: e.conflicts.some((c) => c.toLowerCase().includes(firstWord)) ? "Disclosed exposure" : "Active commentator",
    }));

  logger.info("project", "detail built", { slug, knowledge: ks.length, actors: actors.length });

  return {
    project: {
      id: project.id, slug: project.slug, name: project.name, category: project.category, description: project.description,
      tvlUsd: project.tvlUsd, volume24hUsd: project.volume24hUsd, sentiment: project.sentiment, launchDate: project.launchDate,
      tokenSymbol: project.tokenSymbol, hero: project.hero, locked: !isProjectAccessible(project.id),
      tvl30dPct, volume30dPct,
    },
    series: project.series,
    cifScore,
    knowledge: {
      total: ks.length,
      bySource,
      top: [...ks].sort((a, b) => b.confidence - a.confidence).slice(0, 5).map((k) => ({ statement: k.statement, source: k.source, confidence: k.confidence, author: (k as { author?: string }).author === "CIF" ? "INTENT" : ((k as { author?: string }).author ?? "INTENT") })),
    },
    events: s.events.filter((e) => e.projectId === project.id).map((e) => ({ id: e.id, title: e.title, kind: e.kind, occurredAt: e.occurredAt, probability: e.probability })),
    actors,
    signals: s.signals.filter((x) => x.projectId === project.id).map((x) => ({ id: x.id, type: x.type, strength: x.strength, payload: x.payload, detectedAt: x.detectedAt })),
    pov: s.povMatrix.filter((r) => r.projectId === project.id).map((r) => ({ segment: r.segment, allocation_pct: r.allocationPct, sold_7d_pct: r.sold7dPct, holding_pct: r.holdingPct })),
    airdrop: (() => {
      const a = s.airdrops.find((x) => x.projectId === project.id);
      return a ? { token: a.token, dropped_usd: a.droppedUsd, claimants: a.claimants, sell_pressure_7d_pct: a.sellPressure7dPct } : null;
    })(),
    activePatterns: (() => {
      const acts = patternActivations(s, project);
      return s.patterns
        .map((p, i) => ({ name: p.name, activation: acts[i] }))
        .filter((x) => x.activation >= 0.3)
        .sort((a, b) => b.activation - a.activation)
        .slice(0, 6);
    })(),
  };
}
