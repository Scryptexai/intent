/** Domain model shared by the seed store, intelligence engines and the UI. */

export type Plan = "free" | "pro" | "ultimate";
export type Role = "viewer" | "analyst" | "admin";

/** Urutan tier untuk gating (dipakai client & server). */
export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, ultimate: 2 };
export function atLeast(plan: Plan | string | null | undefined, min: Plan): boolean {
  return (PLAN_RANK[(plan as Plan) ?? "free"] ?? 0) >= PLAN_RANK[min];
}

/** Cakupan pasar. Kripto terbuka untuk semua tier berbayar; sisanya Ultimate. */
export type MarketId = "crypto" | "stocks" | "ai" | "commodities";
export const MARKETS: { id: MarketId; label: string; desc: string; ultimate: boolean }[] = [
  { id: "crypto", label: "Kripto", desc: "500+ proyek on-chain", ultimate: false },
  { id: "stocks", label: "Saham", desc: "Equities global berkualitas", ultimate: true },
  { id: "ai", label: "AI & Tech", desc: "Infrastruktur & aplikasi AI", ultimate: true },
  { id: "commodities", label: "Komoditas", desc: "Makro & hard assets", ultimate: true },
];

export interface MetricPoint {
  /** ISO day */
  t: string;
  tvl: number;
  volume: number;
  sentiment: number; // -1..1
}

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  tvlUsd: number;
  volume24hUsd: number;
  sentiment: number;
  launchDate: string;
  tokenSymbol: string | null;
  isDemo: boolean;
  hero: boolean;
  series: MetricPoint[]; // 90 days
}

export interface PatternRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  baseRate: number; // historical probability of the canonical outcome
  impact: { tvl: number; sentiment: number; volume: number };
}

export interface KnowledgeRow {
  id: string;
  projectId: string;
  source: "research" | "onchain" | "social" | "docs";
  statement: string;
  confidence: number;
  tags: string[];
}

export interface EventRow {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  kind: "decision" | "outcome" | "catalyst";
  occurredAt: string;
  probability: number;
  impact: { tvl: number; sentiment: number; volume: number };
}

export interface SignalRow {
  id: string;
  projectId: string;
  type: string;
  strength: number;
  payload: Record<string, unknown>;
  detectedAt: string;
}

export interface EntityRow {
  id: string;
  name: string;
  kind: "fund" | "kol" | "team" | "whale" | "protocol";
  credibilityScore: number; // 0..100
  trackRecord: { wins: number; losses: number; calls: number };
  conflicts: string[];
  stances: { narrativeId: string; stance: number }[]; // -1 bearish .. 1 bullish
}

export interface NarrativeRow {
  id: string;
  title: string;
  heat: number; // 0..1 social traction
  evidence: { onchain: number; docs: number; social: number; insider: number }; // 0..1
}

export interface ConflictRow {
  id: string;
  projectAId: string;
  projectBId: string;
  narrative: string;
  severity: "low" | "medium" | "high";
}

export interface PovRow {
  projectId: string;
  segment: "retail" | "vc" | "whale" | "team" | "farmers";
  allocationPct: number;
  sold7dPct: number;
  sold30dPct: number;
  holdingPct: number;
  avgClaimUsd: number;
}

export interface AirdropRow {
  projectId: string;
  token: string;
  droppedUsd: number;
  claimants: number;
  claimPct: number;
  sellPressure7dPct: number;
  sybilPct: number;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  format: { structure: string[] };
}

export interface DraftRow {
  id: string;
  userId: string;
  sourceType: "airdrop" | "signal" | "knowledge" | "pattern";
  sourceId: string;
  templateId: string;
  generatedContent: string;
  editedContent: string | null;
  status: "draft" | "published";
  shareUrl: string | null;
  createdAt: string;
}

export interface AlertRow {
  id: string;
  projectId: string;
  metric: "tvl" | "volume" | "sentiment";
  anomalyScore: number;
  direction: "up" | "down";
  detail: string;
  resolved: boolean;
  createdAt: string;
}

export interface WatchlistRow {
  id: string;
  userId: string;
  projectId: string;
  alertTriggers: { sentinel: boolean; airdrop: boolean; pattern_match: boolean };
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  role: Role;
  passwordHash: string | null;
}

export interface ActorClaimRow {
  id: string;
  actorId: string;
  claimText: string;
  claimDate: string;
  outcome: "correct" | "incorrect" | "pending";
  evidenceLink: string | null;
  conflictOfInterest: boolean;
}

export interface AnomalyLogRow {
  id: string;
  mode: "bullmq" | "interval" | "manual";
  scannedProjects: number;
  scannedMetrics: number;
  newAlerts: number;
  threshold: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface NarrativeEvidenceRow {
  id: string;
  narrativeId: string;
  channel: "onchain" | "docs" | "social" | "insider";
  value: number;
  updatedAt: string;
}

export interface SimulationRow {
  id: string;
  userId: string;
  projectId: string;
  variable: string;
  value: number;
  result: { expectedTvlPct: number; p10: number; p50: number; p90: number };
  shareToken: string | null;
  createdAt: string;
}

/** Calibration track record (§3.3 / §9.3.3) — falsifiable, timestamped calls. */
export interface CalibrationCall {
  id: string;
  projectId: string;
  statement: string;
  triggerCondition: string; // objective, checkable
  patternConfidence: number; // 0..1
  trajectoryProbability: number; // 0..1 (never "success probability")
  asOfDate: string;
  resolveAfter: string;
  outcome: "pending" | "pass" | "fail" | "inconclusive";
  gradedAt: string | null;
  gradedBy: string | null;
}

/** In-app notifications (watchlist → Sentinel alerts). */
export interface NotificationRow {
  id: string;
  userId: string;
  kind: "sentinel" | "airdrop" | "pattern_match";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}
