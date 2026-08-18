import { getStore } from "@/lib/store";
import type { EventRow } from "@/lib/domain";
import { logger, ServiceError } from "@/services/logger";
import { randomUUID } from "crypto";

/**
 * ── THE MULTIVERSE · Decision Chain Builder ────────────────────────────────
 * Builds the causal graph (nodes + edges) for React Flow and lets the user
 * add counter-factual "what-if" branches (feeds The Edge).
 */

export interface ChainNode {
  id: string;
  parentId: string | null;
  title: string;
  kind: "decision" | "outcome" | "catalyst";
  occurredAt: string;
  probability: number;
  impact: { tvl: number; sentiment: number; volume: number };
  counterFactual: boolean;
}

export function getDecisionChain(projectId: string): { nodes: ChainNode[]; edges: { id: string; source: string; target: string; probability: number; counterFactual: boolean }[] } {
  const s = getStore();
  const events = s.events.filter((e) => e.projectId === projectId);
  if (events.length === 0) throw new ServiceError("CHAIN_EMPTY", `No decision events for '${projectId}'`, 404);

  const nodes: ChainNode[] = events.map((e) => ({
    id: e.id,
    parentId: e.parentId,
    title: e.title,
    kind: e.kind,
    occurredAt: e.occurredAt,
    probability: e.probability,
    impact: e.impact,
    counterFactual: e.probability < 0.5 || e.title.toLowerCase().includes("counter-factual"),
  }));

  const edges = events
    .filter((e) => e.parentId && events.some((x) => x.id === e.parentId))
    .map((e) => ({
      id: `${e.parentId}->${e.id}`,
      source: e.parentId!,
      target: e.id,
      probability: e.probability,
      counterFactual: e.probability < 0.5,
    }));

  logger.info("multiverse", "chain built", { projectId, nodes: nodes.length, edges: edges.length });
  return { nodes, edges };
}

export function addBranch(args: { projectId: string; parentId: string | null; title: string; probability?: number; impact?: EventRow["impact"] }): ChainNode {
  const s = getStore();
  const project = s.projects.find((p) => p.id === args.projectId);
  if (!project) throw new ServiceError("PROJECT_NOT_FOUND", `No project '${args.projectId}'`, 404);
  const title = String(args.title ?? "").trim();
  if (title.length < 3) throw new ServiceError("BAD_TITLE", "Branch title too short", 400);
  if (title.length > 200) throw new ServiceError("BAD_TITLE", "Branch title too long (max 200)", 400);
  const probability = Math.min(0.99, Math.max(0.01, Number(args.probability ?? 0.3) || 0.3));
  if (args.parentId && !s.events.some((e) => e.id === args.parentId)) throw new ServiceError("PARENT_NOT_FOUND", "Parent event missing", 404);

  const node: EventRow = {
    id: randomUUID(),
    projectId: project.id,
    parentId: args.parentId,
    title,
    kind: "decision",
    occurredAt: new Date().toISOString(),
    probability,
    impact: args.impact ?? { tvl: 0.1, sentiment: 0.1, volume: 0.1 },
  };
  s.events.push(node);
  logger.info("multiverse", "branch added", { projectId: project.id, branch: node.id, title: node.title });
  return { ...node, counterFactual: node.probability < 0.5 };
}
