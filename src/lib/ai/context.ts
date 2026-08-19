import { getStore } from "@/lib/store";
import { patternActivations } from "@/services/vectors";

/**
 * Builds the structured dataset (JSON) that is injected into the AI prompt.
 * FASE 2C step 1-2: fetch raw data → format into clean JSON.
 */

export type SourceType = "airdrop" | "signal" | "knowledge" | "pattern";

export interface StudioContext {
  sourceType: SourceType;
  sourceId: string;
  title: string;
  data: Record<string, unknown>;
  projectName: string;
  projectId: string;
}

export function buildContext(sourceType: SourceType, sourceId: string): StudioContext | null {
  const s = getStore();

  if (sourceType === "airdrop") {
    const airdrop = s.airdrops.find((a) => a.projectId === sourceId) ?? s.airdrops.find((a) => a.token.toLowerCase() === sourceId.toLowerCase());
    const project = airdrop ? s.projects.find((p) => p.id === airdrop.projectId) : s.projects.find((p) => p.id === sourceId || p.slug === sourceId);
    if (!project) return null;
    const drop = s.airdrops.find((a) => a.projectId === project.id);
    const pov = s.povMatrix.filter((r) => r.projectId === project.id);
    const events = s.events.filter((e) => e.projectId === project.id);
    const knowledge = s.knowledge.filter((k) => k.projectId === project.id).slice(0, 6);
    const activations = patternActivations(s, project);
    const patterns = s.patterns.filter((_, i) => activations[i] >= 0.35).map((p, _) => p.name);
    return {
      sourceType,
      sourceId: project.id,
      projectId: project.id,
      projectName: project.name,
      title: `${project.name} airdrop post-mortem`,
      data: {
        project: { name: project.name, category: project.category, tvl_usd: project.tvlUsd, volume_24h_usd: project.volume24hUsd, sentiment: project.sentiment },
        airdrop: drop
          ? { token: drop.token, dropped_usd: drop.droppedUsd, claimants: drop.claimants, claim_rate_pct: drop.claimPct, sell_pressure_7d_pct: drop.sellPressure7dPct, sybil_pct: drop.sybilPct }
          : null,
        pov_matrix: pov.map((r) => ({ segment: r.segment, allocation_pct: r.allocationPct, sold_7d_pct: r.sold7dPct, sold_30d_pct: r.sold30dPct, holding_pct: r.holdingPct, avg_claim_usd: r.avgClaimUsd })),
        decision_events: events.map((e) => ({ title: e.title, kind: e.kind, occurred_at: e.occurredAt, probability: e.probability })),
        active_patterns: patterns,
        conflicts: [
          ...s.conflicts.filter((c) => c.projectAId === project.id).map((c) => c.narrative),
          ...((s.cif?.conflicts?.[project.name] ?? []) as { title?: string }[]).map((c) => c.title ?? ""),
        ].filter(Boolean),
        knowledge_sample: knowledge.map((k) => ({ statement: k.statement, confidence: k.confidence, source: k.source })),
      },
    };
  }

  if (sourceType === "signal") {
    const signal = s.signals.find((x) => x.id === sourceId);
    if (!signal) return null;
    const project = s.projects.find((p) => p.id === signal.projectId);
    if (!project) return null;
    const knowledge = s.knowledge.filter((k) => k.projectId === project.id).slice(0, 4);
    return {
      sourceType,
      sourceId: signal.id,
      projectId: project.id,
      projectName: project.name,
      title: `${project.name} — ${signal.type} signal`,
      data: {
        signal: { type: signal.type, strength: signal.strength, detected_at: signal.detectedAt, payload: signal.payload },
        project: { name: project.name, category: project.category, tvl_usd: project.tvlUsd, volume_24h_usd: project.volume24hUsd, sentiment: project.sentiment },
        trend_30d: (() => {
          const ser = project.series.slice(-30);
          return { tvl_change_pct: Math.round((ser[ser.length - 1].tvl / ser[0].tvl - 1) * 1000) / 10, volume_change_pct: Math.round((ser[ser.length - 1].volume / ser[0].volume - 1) * 1000) / 10, sentiment_delta: Math.round((ser[ser.length - 1].sentiment - ser[0].sentiment) * 100) / 100 };
        })(),
        knowledge_sample: knowledge.map((k) => ({ statement: k.statement, confidence: k.confidence, source: k.source })),
      },
    };
  }

  if (sourceType === "pattern") {
    const pattern = s.patterns.find((p) => p.id === sourceId || p.slug === sourceId);
    if (!pattern) return null;
    const affected = s.projects
      .map((p) => ({ p, act: patternActivations(s, p)[s.patterns.findIndex((x) => x.id === pattern.id)] }))
      .filter((x) => x.act >= 0.45)
      .sort((a, b) => b.act - a.act)
      .slice(0, 5);
    return {
      sourceType,
      sourceId: pattern.id,
      projectId: affected[0]?.p.id ?? "",
      projectName: pattern.name,
      title: `Pattern report: ${pattern.name}`,
      data: {
        pattern: { name: pattern.name, base_rate: pattern.baseRate, description: pattern.description, typical_impact: pattern.impact },
        currently_affected_projects: affected.map((x) => ({ name: x.p.name, activation: x.act, category: x.p.category })),
      },
    };
  }

  // knowledge
  const item = s.knowledge.find((k) => k.id === sourceId);
  if (!item) return null;
  const project = s.projects.find((p) => p.id === item.projectId);
  return {
    sourceType,
    sourceId: item.id,
    projectId: project?.id ?? "",
    projectName: project?.name ?? "Unknown",
    title: `Knowledge item — ${item.statement.slice(0, 60)}…`,
    data: {
      knowledge: { statement: item.statement, source: item.source, confidence: item.confidence, tags: item.tags },
      project: project ? { name: project.name, category: project.category, tvl_usd: project.tvlUsd, sentiment: project.sentiment } : null,
    },
  };
}
