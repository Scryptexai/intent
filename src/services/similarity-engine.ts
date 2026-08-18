import type { ProjectRow } from "@/lib/domain";
import { cosine, ensureFeatureVectors, patternActivations } from "@/services/vectors";
import { getStore } from "@/lib/store";
import { logger, ServiceError } from "@/services/logger";

/**
 * ── THE MIRROR · Similarity Engine ─────────────────────────────────────────
 * 1. Loads the target's persisted feature_vector (category one-hot,
 *    fundamentals, 16 pattern activations, knowledge tags).
 * 2. Cosine-compares it against all 500 monitored projects.
 * 3. Returns top-3 analogs + similarity + projected impact transfer.
 */

export interface AnalogHit {
  project: ProjectRow;
  similarity: number;
  matchedPatterns: { slug: string; name: string; strength: number }[];
  projection: { tvl30dPct: number; sentiment30d: number; volume30dPct: number };
  rationale: string;
}

export interface MirrorResult {
  target: ProjectRow;
  analogs: AnalogHit[];
  scannedProjects: number;
  knowledgeCorpus: number;
  patternCount: number;
}

export function findAnalogProject(projectId: string, topN = 3): MirrorResult {
  const s = getStore();
  ensureFeatureVectors(s);
  const target = s.projects.find((p) => p.id === projectId || p.slug === projectId);
  if (!target) throw new ServiceError("PROJECT_NOT_FOUND", `No project '${projectId}'`, 404);

  const vTarget = s.featureVectors.get(target.id) ?? [];
  const aTarget = patternActivations(s, target);

  const scored = s.projects
    .filter((p) => p.id !== target.id)
    .map((p) => ({ project: p, similarity: cosine(vTarget, s.featureVectors.get(p.id) ?? []) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(topN, 1));

  const analogs: AnalogHit[] = scored.map(({ project, similarity }) => {
    const aAnalog = patternActivations(s, project);
    const matched = s.patterns
      .map((pat, i) => ({ pat, overlap: Math.min(aTarget[i], aAnalog[i]) }))
      .filter((m) => m.overlap >= 0.35)
      .sort((x, y) => y.overlap - x.overlap)
      .slice(0, 4)
      .map((m) => ({ slug: m.pat.slug, name: m.pat.name, strength: Math.round(m.overlap * 100) / 100 }));

    const ser = project.series;
    const last30 = ser.slice(-30);
    const t0 = last30[0];
    const t1 = last30[last30.length - 1];

    const topPat = matched[0];
    const rationale = topPat
      ? `Shares the "${topPat.name}" signature (overlap ${(topPat.strength * 100).toFixed(0)}%) and ${project.category === target.category ? `the same ${target.category} category` : "a comparable fundamental profile"}.`
      : `Structurally similar fundamentals (${similarity.toFixed(2)} cosine) across category, flow and knowledge dimensions.`;

    return {
      project,
      similarity: Math.round(similarity * 1000) / 1000,
      matchedPatterns: matched,
      projection: {
        tvl30dPct: Math.round(((t1.tvl / Math.max(1, t0.tvl) - 1) * similarity) * 1000) / 10,
        sentiment30d: Math.round(((t1.sentiment - t0.sentiment) * similarity) * 100) / 100,
        volume30dPct: Math.round(((t1.volume / Math.max(1, t0.volume) - 1) * similarity) * 1000) / 10,
      },
      rationale,
    };
  });

  logger.info("mirror", "findAnalogProject", { target: target.slug, top: analogs[0]?.project.slug, sim: analogs[0]?.similarity });

  return {
    target,
    analogs,
    scannedProjects: s.projects.length,
    knowledgeCorpus: s.knowledge.length,
    patternCount: s.patterns.length,
  };
}
