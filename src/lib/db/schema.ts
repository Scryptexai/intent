import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INTENT — Database Schema (Drizzle / PostgreSQL · Neon)
 *
 * Core intelligence tables + AI Content Studio + Subscription/Watchlist.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const planEnum = pgEnum("plan", ["free", "pro"]);
export const draftStatusEnum = pgEnum("draft_status", ["draft", "published"]);
export const roleEnum = pgEnum("user_role", ["viewer", "analyst", "admin"]);

// ── Users & Subscription ────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  plan: planEnum("plan").notNull().default("free"),
  role: roleEnum("role").notNull().default("viewer"),
  passwordHash: text("password_hash"), // scrypt; null = SSO-only account
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Core: Projects ──────────────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    description: text("description"),
    tvlUsd: numeric("tvl_usd").notNull().default("0"),
    volume24hUsd: numeric("volume_24h_usd").notNull().default("0"),
    sentiment: numeric("sentiment").notNull().default("0"), // -1 .. 1
    launchDate: timestamp("launch_date", { withTimezone: true }),
    tokenSymbol: varchar("token_symbol", { length: 12 }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ categoryIdx: index("projects_category_idx").on(t.category) }),
);

// ── Core: Entities (actors — funds, KOLs, teams, whales) ────────────────────
export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(), // 'fund' | 'kol' | 'team' | 'whale' | 'protocol'
  credibilityScore: numeric("credibility_score").notNull().default("0"), // 0..100
  trackRecord: jsonb("track_record").$type<{ wins: number; losses: number; calls: number }>(),
  conflicts: jsonb("conflicts").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Core: Events (Decision Events — forks in the Multiverse) ────────────────
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"), // self-reference → causal tree
    title: varchar("title", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 40 }).notNull(), // decision | outcome | catalyst
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    probability: numeric("probability").default("1"), // 0..1 (for counter-factual branches)
    impact: jsonb("impact").$type<{ tvl: number; sentiment: number; volume: number }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("events_project_idx").on(t.projectId) }),
);

// ── Core: Signals ───────────────────────────────────────────────────────────
export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(), // 'whale_move' | 'unlock' | 'sentiment_shift' | ...
    strength: numeric("strength").notNull().default("0"), // 0..1
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("signals_project_idx").on(t.projectId) }),
);

// ── Core: Knowledge items (the 1,039 corpus) ────────────────────────────────
export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 40 }).notNull(), // 'research' | 'onchain' | 'social' | 'docs'
    statement: text("statement").notNull(),
    confidence: numeric("confidence").notNull().default("0.5"), // 0..1
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("knowledge_project_idx").on(t.projectId) }),
);

// ── Core: Conflicts (contradictions between knowledge items) ────────────────
export const conflicts = pgTable("conflicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectA: uuid("project_a").references(() => projects.id, { onDelete: "cascade" }),
  projectB: uuid("project_b").references(() => projects.id, { onDelete: "cascade" }),
  narrative: text("narrative").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low|medium|high
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Patterns (the 16 recurring market patterns) ─────────────────────────────
export const patterns = pgTable("patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  baseRate: numeric("base_rate").default("0.5"), // historical frequency of the outcome
});

// ── AI Content Studio: Templates ────────────────────────────────────────────
export const contentTemplates = pgTable("content_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(), // 'Thread Analyst', 'TL;DR', 'Data Drop'
  description: text("description"),
  systemPrompt: text("system_prompt"), // Prompt for the AI
  format: jsonb("format").$type<{ structure: string[] }>(), // { structure: ['hook','data','conclusion'] }
});

// ── AI Content Studio: Drafts ───────────────────────────────────────────────
export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sourceType: varchar("source_type", { length: 20 }), // 'airdrop' | 'signal' | 'knowledge' | 'pattern'
    sourceId: uuid("source_id"),
    templateId: uuid("template_id").references(() => contentTemplates.id),
    generatedContent: text("generated_content"),
    editedContent: text("edited_content"),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // 'draft' | 'published'
    shareUrl: text("share_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("drafts_user_idx").on(t.userId) }),
);

// ── Subscription & Watchlist ────────────────────────────────────────────────
export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  alertTriggers: jsonb("alert_triggers").$type<{
    sentinel: boolean;
    airdrop: boolean;
    pattern_match: boolean;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Alerts (produced by The Sentinel) ───────────────────────────────────────
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    metric: varchar("metric", { length: 30 }).notNull(), // 'tvl' | 'volume' | 'sentiment'
    anomalyScore: numeric("anomaly_score").notNull().default("0"), // |z-score|
    direction: varchar("direction", { length: 10 }).notNull().default("up"), // 'up' | 'down'
    detail: text("detail"),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("alerts_created_idx").on(t.createdAt) }),
);

// ── Usage tracking (for Free/Pro gating on AI generations) ──────────────────
export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 30 }).notNull(), // 'ai_generation'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ── Sentinel: scan execution logs ───────────────────────────────────────────
export const anomalyLogs = pgTable("anomaly_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  mode: varchar("mode", { length: 20 }).notNull(), // 'bullmq' | 'interval' | 'manual'
  scannedProjects: integer("scanned_projects").notNull().default(0),
  scannedMetrics: integer("scanned_metrics").notNull().default(0),
  newAlerts: integer("new_alerts").notNull().default(0),
  threshold: numeric("threshold").notNull().default("2"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// ── Origin: actor claims (feed the credibility engine) ──────────────────────
export const actorClaims = pgTable(
  "actor_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => entities.id, { onDelete: "cascade" }),
    claimText: text("claim_text").notNull(),
    claimDate: timestamp("claim_date", { withTimezone: true }).notNull().defaultNow(),
    outcome: varchar("outcome", { length: 20 }).notNull().default("pending"), // correct | incorrect | pending
    evidenceLink: text("evidence_link"),
    conflictOfInterest: boolean("conflict_of_interest").notNull().default(false),
  },
  (t) => ({ actorIdx: index("claims_actor_idx").on(t.actorId) }),
);

// ── Origin: narratives + per-channel evidence (Truth Matrix source tables) ──
export const narratives = pgTable("narratives", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  heat: numeric("heat").notNull().default("0.5"), // 0..1 social traction
});

export const narrativeEvidence = pgTable(
  "narrative_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    narrativeId: uuid("narrative_id").references(() => narratives.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 20 }).notNull(), // onchain | docs | social | insider
    value: numeric("value").notNull().default("0.5"), // 0..1 evidence strength
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ narrativeIdx: index("evidence_narrative_idx").on(t.narrativeId) }),
);

// ── Mirror: persisted feature vectors ───────────────────────────────────────
export const featureVectors = pgTable("feature_vectors", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  vector: jsonb("vector").$type<number[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Edge: saved simulations (shareable with team) ───────────────────────────
export const simulations = pgTable(
  "simulations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    variable: varchar("variable", { length: 40 }).notNull(),
    value: numeric("value").notNull().default("0"),
    result: jsonb("result").$type<{ expectedTvlPct: number; p10: number; p50: number; p90: number }>(),
    shareToken: varchar("share_token", { length: 24 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("simulations_project_idx").on(t.projectId) }),
);

// ── Enterprise: immutable audit log ─────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorEmail: varchar("actor_email", { length: 255 }),
    action: varchar("action", { length: 60 }).notNull(), // login | draft.save | sim.save | ack | export …
    resource: varchar("resource", { length: 120 }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("audit_created_idx").on(t.createdAt) }),
);

// ── Enterprise: calibration track record (public Track Record page) ─────────
export const calibrationCalls = pgTable("calibration_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  statement: text("statement").notNull(),
  triggerCondition: text("trigger_condition").notNull(), // objective, checkable
  patternConfidence: numeric("pattern_confidence"),
  trajectoryProbability: numeric("trajectory_probability"),
  asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull().defaultNow(),
  resolveAfter: timestamp("resolve_after", { withTimezone: true }),
  outcome: varchar("outcome", { length: 20 }), // pass | fail | inconclusive | pending
  gradedAt: timestamp("graded_at", { withTimezone: true }),
});

// ── Enterprise: programmatic API keys ───────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  label: varchar("label", { length: 80 }).notNull(),
  keyHash: text("key_hash").notNull(), // sha256 of the raw key
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  revoked: boolean("revoked").notNull().default(false),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Billing: subscriptions / payments / KYC (Sumsub) ────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  plan: varchar("plan", { length: 20 }).notNull().default("pro"),
  status: varchar("status", { length: 20 }).notNull().default("trialing"), // trialing|active|past_due|canceled
  provider: varchar("provider", { length: 20 }), // stripe|paypal|crypto
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(), // stripe|paypal|crypto
  method: varchar("method", { length: 30 }), // card|paypal|usdt-eth|usdt-solana
  amountUsd: numeric("amount_usd").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|confirmed|failed
  payTo: text("pay_to"), // crypto treasury address
  paymentRef: varchar("payment_ref", { length: 32 }),
  txHash: text("tx_hash"),
  chain: varchar("chain", { length: 20 }), // eth|solana
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});


export type Project = typeof projects.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type ContentDraft = typeof contentDrafts.$inferSelect;
export type Pattern = typeof patterns.$inferSelect;
