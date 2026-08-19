import { getStore } from "@/lib/store";
import type { ActorClaimRow, EntityRow } from "@/lib/domain";
import { logger, ServiceError } from "@/services/logger";

/**
 * ── THE ORIGIN · Actor Credibility Engine ──────────────────────────────────
 * Credibility = hit-rate (from actor_claims) × sample-size weight + 20 base,
 * discounted by disclosed conflicts and flagged conflicts-of-interest.
 */

export interface ActorReport {
  entity: EntityRow;
  hitRate: number;
  reliability: number;
  resolvedCalls: number;
  pendingCalls: number;
  flags: string[];
  conflictClaims: number;
}

export function getActorCredibility(actorId: string): ActorReport {
  const s = getStore();
  const entity = s.entities.find((e) => e.id === actorId);
  if (!entity) throw new ServiceError("ACTOR_NOT_FOUND", `No actor '${actorId}'`, 404);
  return buildReport(entity, s.actorClaims.filter((c) => c.actorId === actorId));
}

function buildReport(entity: EntityRow, claims: ActorClaimRow[]): ActorReport {
  const resolved = claims.filter((c) => c.outcome !== "pending");
  const correct = resolved.filter((c) => c.outcome === "correct").length;
  const hitRate = resolved.length > 0 ? correct / resolved.length : 0;
  const sampleWeight = Math.min(1, resolved.length / 30);
  const conflictClaims = claims.filter((c) => c.conflictOfInterest).length;
  const conflictPenalty = entity.conflicts.length * 6 + conflictClaims * 2;
  const reliability = Math.max(0, Math.min(100, Math.round(hitRate * sampleWeight * 100 + 20 - conflictPenalty)));

  const flags: string[] = [...entity.conflicts];
  if (resolved.length < 10) flags.push("Low sample size — treat with caution");
  if (entity.kind === "whale") flags.push("On-chain position visible → signals may be self-serving");
  if (entity.kind === "team") flags.push("Direct token exposure");
  if (conflictClaims > 0) flags.push(`${conflictClaims} claim(s) flagged conflict-of-interest`);

  return { entity, hitRate: Math.round(hitRate * 100) / 100, reliability, resolvedCalls: resolved.length, pendingCalls: claims.length - resolved.length, flags, conflictClaims };
}

export function actorReports(): ActorReport[] {
  const s = getStore();
  const reports = s.entities
    .map((e) => buildReport(e, s.actorClaims.filter((c) => c.actorId === e.id)))
    .sort((a, b) => b.reliability - a.reliability);
  logger.info("origin", "actorReports", { actors: reports.length });
  return reports;
}

export function actorClaims(actorId: string): ActorClaimRow[] {
  const s = getStore();
  return s.actorClaims
    .filter((c) => c.actorId === actorId)
    .sort((a, b) => b.claimDate.localeCompare(a.claimDate));
}
