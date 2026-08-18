/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CIF LOCKED DATA SCHEMA — TypeScript contracts.
 *
 * Mirrors the machine-readable exports of the Crypto Intelligence Framework
 * source-of-truth repo (`poc/*.json`, schema `cif-export/1`, parsed by
 * tools/build_json.py) and the structural contracts in `docs/Schema/*`.
 * The product blueprint may still evolve; THIS shape is locked — the app
 * adapts to it, not the other way around.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const POVS = ["Founder", "VC", "Retail", "Community", "Developer", "Institution", "Validator", "Builder"] as const;
export type Pov = (typeof POVS)[number];

/** cif.json / projects.json — curated catalog row */
export interface CifProject {
  n: string; // project name
  tier: "Deep" | "Summary";
  file: string; // dossier path in the CIF repo
  cat: string; // category / sector description
  era: string; // Context era, e.g. "2021–"
  tags: string[];
}

export interface CifMeta {
  schema: string; // "cif-export/1"
  generated: string;
  projects: number;
  deep: number;
  summary: number;
  sentiment: number;
  patterns: number;
  source: string;
}

/** decision_events.json — the atomic causal unit (docs/Ontology/DecisionEvent.md) */
export interface CifDecisionEvent {
  project: string;
  date: string;
  title: string;
  // Context-adjacent hidden factors (docs/Ontology/Hidden.md)
  motivation: string;
  constraint: string;
  pressure: string;
  tradeoff: string;
  alternatives: string;
  expectation_vs_actual: string;
  /** 8-POV stakeholder reactions */
  reactions: Partial<Record<Pov, string>>;
  grounding: string | null;
  trigger: string;
  evidence: string | null;
  decision: string;
  immediate_result: string;
  long_term_impact: string;
  supporting_dataset: string | null;
  open_threads: string | null;
}

/** entities.json — entity graph nodes (docs/Ontology/Relationships.md) */
export interface CifEntity {
  id: string;
  projectSlug: string;
  name: string;
  type: string; // Organization | Person | Investor | Foundation | Exchange | Partner …
  status: string | null;
  description: string;
  founded: string | null;
  relatedKnowledge: string[];
  relatedEvents: string[];
  metadata?: Record<string, unknown>;
}

/** knowledge.json — extracted knowledge items with citation trail */
export interface CifKnowledgeItem {
  id: string;
  projectSlug: string;
  name: string;
  category: string;
  description: string;
  confidence: number; // 0..100
  status: string | null;
  updatedAt: string | null;
  author: string;
  evidence: unknown[];
  evidenceText: string; // raw citation passage (§3.1 one-click source)
}

/** events.json — historical timeline events */
export interface CifTimelineEvent {
  id: string;
  projectSlug: string;
  name: string;
  date: string;
  type: string; // Founding | Funding | Launch | Incident | Governance …
  participants: string[];
  description: string;
  result: string;
  source: string;
  url: string | null;
  affectedKnowledge: string[];
  _location?: string;
  _status?: string;
}

/** patterns.json — the locked 16-pattern registry (examples/PatternRegistry.md) */
export interface CifPattern {
  id: string; // P1..P16
  nm: string;
  triggers: string[];
  instances: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  analogs: string[]; // project names the pattern was observed in
  src: string;
  val: string; // validated note
  pred: string; // prediction statement
  watch: string[]; // objective signals-to-watch
  scope: string; // Context/era range the pattern applies under
}

/** conflicts.json — cross-checked source conflicts (Phase 11) */
export interface CifConflictVersion {
  source: string;
  value: string;
  date: string | null;
  url: string | null;
  evidence: string;
}
export interface CifConflict {
  id: string;
  projectSlug: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string; // Resolved | Unresolved
  versionA: CifConflictVersion;
  versionB: CifConflictVersion;
  resolution: string | null;
  affectedKnowledge: string[];
  affectedPhase: string | null;
}

/** qa.json — Intent Score = research completeness (6 weighted dimensions) */
export interface CifQaDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  description: string;
}
export interface CifQa {
  projectSlug: string;
  total: number;
  dimensions: CifQaDimension[];
}

/** behavior.json — behavioral intelligence (strategic objectives & decision patterns) */
export interface CifBehavior {
  projectSlug: string;
  strategicObjectives: string[];
  decisionPatterns: string[];
  [k: string]: unknown;
}

/** benchmarks.json — closed backtests (public Track Record source) */
export interface CifBenchmark {
  title: string;
  type: string;
  category: string;
  given: string[];
  expect: string[];
  outcome: string;
  [k: string]: unknown;
}

/** Whole locked dataset, keyed the way the CIF repo exports it. */
export interface CifDataset {
  meta: CifMeta;
  projects: CifProject[];
  decisionEvents: Record<string, CifDecisionEvent[]>;
  entities: Record<string, CifEntity[]>;
  knowledge: Record<string, CifKnowledgeItem[]>;
  events: Record<string, CifTimelineEvent[]>;
  patterns: CifPattern[];
  conflicts: Record<string, CifConflict[]>;
  qa: Record<string, CifQa>;
  behavior: Record<string, CifBehavior>;
  benchmarks: CifBenchmark[];
}

export interface CifStats {
  schema: string;
  generated: string;
  projects: number;
  decisionEvents: number;
  entities: number;
  knowledge: number;
  timelineEvents: number;
  patterns: number;
  conflicts: number;
  qaScored: number;
  benchmarks: number;
}
