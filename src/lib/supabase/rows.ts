/**
 * Row shapes of the live CIF-owned Supabase tables (confirmed schema,
 * ApplicationBlueprint §10.1 + EnterpriseRoadmap state table).
 */

export interface SbCifProject {
  id: string; // CIF slug e.g. "layerzero"
  name: string;
  category: string[] | string | null; // text[] split on "/" — defensive union
  tier: string | null;
  era: string | null;
  tags: string[] | null;
  is_todays_pick: boolean | null;
  pattern_confidence: number | null;
  trajectory_probability: number | null;
  observable: Record<string, unknown> | null;
  current_read: string | null;
  signal: Record<string, unknown> | null;
  evidence: unknown | null;
  comparables: unknown | null;
  source_file: string | null;
  synced_at: string | null;
}

export interface SbCifPattern {
  id: string; // P1..
  name: string;
  confidence: string | null;
  instances: number | null;
  scope: string | null;
  analogs: string[] | null;
  triggers: string[] | null;
  source: string | null;
  prediction: string | null;
  validation: string | null;
  watch: string[] | null;
  synced_at: string | null;
}

export interface SbCifBacktest {
  id: string;
  title: string;
  type: string | null;
  category: string | null;
  given: string[] | null;
  expect: string[] | null;
  fired: string[] | null;
  missed: string[] | null;
  outcome: string | null;
  source: string | null;
  verdict: string | null;
  recall: number | null;
  file: string | null;
  synced_at: string | null;
}

export interface SbEntity {
  id: string;
  projectSlug?: string | null;
  project_slug?: string | null;
  name: string | null;
  type: string | null;
  description?: string | null;
  [k: string]: unknown;
}

export interface SbEvidenceItem {
  id: string;
  [k: string]: unknown;
}

export interface LiveCatalog {
  source: "supabase";
  url: string;
  fetchedAt: string;
  tables: Record<string, number | "error">;
  projects: SbCifProject[];
  patterns: SbCifPattern[];
  backtests: SbCifBacktest[];
  entities: SbEntity[];
  evidence: SbEvidenceItem[];
}
