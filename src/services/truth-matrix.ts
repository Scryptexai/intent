import { getStore } from "@/lib/store";
import type { NarrativeRow } from "@/lib/domain";
import { seededJitter } from "@/services/vectors";
import { logger } from "@/services/logger";

/**
 * ── THE ORIGIN · Narrative Truth Matrix ────────────────────────────────────
 * Rows = narratives, columns = evidence channels. Values read from the
 * `narrative_evidence` table. refreshTruthMatrix() re-runs every 24h (armed
 * by the job scheduler) and applies connector-style drift so the matrix is
 * alive.
 */

export interface TruthCell {
  narrativeId: string;
  narrativeTitle: string;
  channel: "onchain" | "docs" | "social" | "insider";
  evidence: number;
  gap: number; // heat − evidence (positive ⇒ narrative outruns evidence)
}

export interface TruthMatrixResult {
  narratives: (NarrativeRow & { avgEvidence: number; gap: number })[];
  cells: TruthCell[];
  lastUpdated: string;
}

export function getTruthMatrix(): TruthMatrixResult {
  const s = getStore();
  const cells: TruthCell[] = [];
  let lastUpdated = "2026-08-09T00:00:00Z";

  const narratives = s.narratives.map((n) => {
    const evs = s.narrativeEvidence.filter((e) => e.narrativeId === n.id);
    const perChannel = { onchain: 0, docs: 0, social: 0, insider: 0 };
    let sum = 0;
    for (const e of evs) {
      perChannel[e.channel] = e.value;
      sum += e.value;
      if (e.updatedAt > lastUpdated) lastUpdated = e.updatedAt;
    }
    const avgEvidence = evs.length ? sum / evs.length : 0;
    for (const channel of ["onchain", "docs", "social", "insider"] as const) {
      cells.push({
        narrativeId: n.id,
        narrativeTitle: n.title,
        channel,
        evidence: perChannel[channel],
        gap: Math.round((n.heat - perChannel[channel]) * 100) / 100,
      });
    }
    return { ...n, avgEvidence: Math.round(avgEvidence * 100) / 100, gap: Math.round((n.heat - avgEvidence) * 100) / 100 };
  });

  narratives.sort((a, b) => b.heat - a.heat);
  return { narratives, cells, lastUpdated };
}

export function topGapNarratives(limit = 3) {
  return getTruthMatrix()
    .narratives.map((n) => ({ narrative: { id: n.id, title: n.title, heat: n.heat }, avgEvidence: n.avgEvidence, gap: n.gap }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, limit);
}

/** 24h scheduler task: re-score evidence channels with bounded drift. */
export function refreshTruthMatrix(): { updated: number } {
  const s = getStore();
  const day = new Date().toISOString().slice(0, 10);
  let updated = 0;
  for (const ev of s.narrativeEvidence) {
    const drift = seededJitter(`${ev.id}:${day}`, 0.06);
    ev.value = Math.round(Math.max(0.05, Math.min(0.98, ev.value + drift)) * 100) / 100;
    ev.updatedAt = new Date().toISOString();
    updated++;
  }
  for (const n of s.narratives) {
    n.heat = Math.round(Math.max(0.05, Math.min(0.98, n.heat + seededJitter(`${n.id}:heat:${day}`, 0.04))) * 100) / 100;
  }
  logger.info("origin", "truth matrix refreshed", { updated, day });
  return { updated };
}
