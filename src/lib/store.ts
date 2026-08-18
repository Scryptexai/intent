import { buildSeed, type SeedData } from "@/lib/data/seed";
import type { AlertRow, DraftRow, WatchlistRow } from "@/lib/domain";
import { ensureFeatureVectors } from "@/services/vectors";
import { effectivePlan } from "@/services/billing";
import { randomUUID } from "crypto";

/**
 * Runtime data layer.
 *
 * Production: Drizzle ORM on Neon Postgres (src/lib/db/client.ts + schema.ts).
 * Demo mode (no DATABASE_URL): in-memory store with the identical seed, kept
 * on globalThis so it survives Next.js HMR in development.
 */

const g = globalThis as unknown as { __cifStore?: SeedData };

export function getStore(): SeedData {
  if (!g.__cifStore) {
    g.__cifStore = buildSeed();
    ensureFeatureVectors(g.__cifStore); // persist 43-d vectors into feature_vectors store
  }
  return g.__cifStore;
}

// ── Subscription gating ──────────────────────────────────────────────────────
export const DEMO_USER_ID = "u-demo";
export const FREE_GENERATION_LIMIT = 3;

export function getUser(userId = DEMO_USER_ID) {
  const s = getStore();
  return s.users.find((u) => u.id === userId) ?? s.users[0];
}

export function setPlan(plan: "free" | "pro" | "ultimate", userId = DEMO_USER_ID) {
  const u = getUser(userId);
  u.plan = plan;
  return u;
}

/** Free tier unlocks only 2 demo projects; Pro unlocks the full 500. */
export function isProjectAccessible(projectId: string, userId = DEMO_USER_ID) {
  const s = getStore();
  const user = getUser(userId);
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return false;
  if (user.plan === "pro" || user.plan === "ultimate") return true;
  return p.isDemo;
}

export function generationsUsedToday(userId = DEMO_USER_ID) {
  const s = getStore();
  const day = new Date().toISOString().slice(0, 10);
  return s.usageEvents.filter((u) => u.userId === userId && u.kind === "ai_generation" && u.createdAt.slice(0, 10) === day).length;
}

export function recordGeneration(userId = DEMO_USER_ID) {
  const s = getStore();
  s.usageEvents.push({ id: randomUUID(), userId, kind: "ai_generation", createdAt: new Date().toISOString() });
}

// ── Alerts (The Sentinel) ────────────────────────────────────────────────────
export function listAlerts(opts: { unresolvedOnly?: boolean } = {}): AlertRow[] {
  const s = getStore();
  return s.alerts
    .filter((a) => (opts.unresolvedOnly ? !a.resolved : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function insertAlert(a: Omit<AlertRow, "id" | "createdAt" | "resolved">): AlertRow {
  const s = getStore();
  const row: AlertRow = { ...a, id: randomUUID(), resolved: false, createdAt: new Date().toISOString() };
  s.alerts.unshift(row);
  return row;
}

export function resolveAlert(id: string) {
  const s = getStore();
  const a = s.alerts.find((x) => x.id === id);
  if (a) a.resolved = true;
  return a ?? null;
}

// ── Drafts (Content Studio) ──────────────────────────────────────────────────
export function listDrafts(userId = DEMO_USER_ID): DraftRow[] {
  return getStore().drafts.filter((d) => d.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createDraft(d: Omit<DraftRow, "id" | "createdAt" | "status" | "shareUrl"> & { status?: DraftRow["status"] }): DraftRow {
  const s = getStore();
  const row: DraftRow = { ...d, status: d.status ?? "draft", shareUrl: null, id: randomUUID(), createdAt: new Date().toISOString() };
  s.drafts.unshift(row);
  return row;
}

export function updateDraft(id: string, patch: Partial<Pick<DraftRow, "editedContent" | "generatedContent" | "status" | "shareUrl">>): DraftRow | null {
  const s = getStore();
  const row = s.drafts.find((d) => d.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  return row;
}

// ── Watchlists ───────────────────────────────────────────────────────────────
export function getWatchlist(userId = DEMO_USER_ID): WatchlistRow[] {
  return getStore().watchlists.filter((w) => w.userId === userId);
}

export function toggleWatch(projectId: string, triggers: WatchlistRow["alertTriggers"], userId = DEMO_USER_ID): WatchlistRow | null {
  const s = getStore();
  const existing = s.watchlists.find((w) => w.userId === userId && w.projectId === projectId);
  if (existing) {
    s.watchlists = s.watchlists.filter((w) => w.id !== existing.id);
    return null; // unwatched
  }
  const row: WatchlistRow = { id: randomUUID(), userId, projectId, alertTriggers: triggers };
  s.watchlists.push(row);
  return row;
}
