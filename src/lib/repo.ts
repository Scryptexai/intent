import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { getStore } from "@/lib/store";
import type { DraftRow, WatchlistRow, SimulationRow, UserRow, Role, Plan } from "@/lib/domain";
import { verifyPassword } from "@/lib/auth/password";
import { logger } from "@/services/logger";

/**
 * ── Enterprise persistence layer ────────────────────────────────────────────
 * User-scoped mutable data (drafts, watchlists, sims, usage, audit, keys)
 * lives in Postgres via Drizzle when DATABASE_URL is set (serverless-safe,
 * survives cold starts, consistent across instances); otherwise falls back to
 * the deterministic in-memory store. Catalog data (projects/DE/entities) is
 * immutable and always served from snapshot/Supabase.
 */

export interface AuthUser extends UserRow {}

export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const db = getDb();
  if (db) {
    const row = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    const u = row[0];
    if (!u || !verifyPassword(password, u.passwordHash)) return null;
    return { id: u.id, email: u.email, name: u.name ?? "", plan: u.plan as Plan, role: u.role as Role, passwordHash: u.passwordHash };
  }
  const s = getStore();
  const u = s.users.find((x) => x.email === email.toLowerCase());
  if (!u || !verifyPassword(password, u.passwordHash)) return null;
  return u;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const db = getDb();
  if (db) {
    const row = await db.select().from(schema.users).where(eq(schema.users.id, id as never)).limit(1);
    const u = row[0];
    return u ? { id: u.id, email: u.email, name: u.name ?? "", plan: u.plan as Plan, role: u.role as Role, passwordHash: u.passwordHash } : null;
  }
  return getStore().users.find((x) => x.id === id) ?? null;
}

// ── Drafts ──────────────────────────────────────────────────────────────────
export async function listDrafts(userId: string): Promise<DraftRow[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.contentDrafts).where(eq(schema.contentDrafts.userId, userId as never)).orderBy(desc(schema.contentDrafts.createdAt));
    return rows.map((r) => ({
      id: r.id, userId: r.userId ?? userId, sourceType: (r.sourceType ?? "airdrop") as DraftRow["sourceType"], sourceId: r.sourceId ?? "",
      templateId: r.templateId ?? "", generatedContent: r.generatedContent ?? "", editedContent: r.editedContent,
      status: (r.status as DraftRow["status"]) ?? "draft", shareUrl: r.shareUrl, createdAt: r.createdAt.toISOString(),
    }));
  }
  return getStore().drafts.filter((d) => d.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDraft(
  d: Omit<DraftRow, "id" | "createdAt" | "status" | "shareUrl" | "editedContent"> & { editedContent?: string | null; status?: DraftRow["status"] },
): Promise<DraftRow> {
  const db = getDb();
  if (db) {
    const [row] = await db.insert(schema.contentDrafts).values({
      userId: d.userId as never, sourceType: d.sourceType, sourceId: d.sourceId, templateId: d.templateId,
      generatedContent: d.generatedContent, editedContent: d.editedContent ?? null, status: d.status ?? "draft",
    }).returning();
    return { id: row.id, userId: d.userId, sourceType: d.sourceType, sourceId: d.sourceId, templateId: d.templateId, generatedContent: d.generatedContent, editedContent: row.editedContent, status: (row.status as DraftRow["status"]) ?? "draft", shareUrl: row.shareUrl, createdAt: row.createdAt.toISOString() };
  }
  const s = getStore();
  const row: DraftRow = { userId: d.userId, sourceType: d.sourceType, sourceId: d.sourceId, templateId: d.templateId, generatedContent: d.generatedContent, editedContent: d.editedContent ?? null, status: d.status ?? "draft", shareUrl: null, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  s.drafts.unshift(row);
  return row;
}

export async function updateDraft(id: string, userId: string, patch: Partial<Pick<DraftRow, "editedContent" | "status" | "shareUrl">>): Promise<DraftRow | null> {
  const db = getDb();
  if (db) {
    const [owned] = await db.select().from(schema.contentDrafts).where(and(eq(schema.contentDrafts.id, id), eq(schema.contentDrafts.userId, userId as never))).limit(1);
    if (!owned) return null; // ownership enforced → no IDOR
    const [row] = await db.update(schema.contentDrafts).set(patch).where(eq(schema.contentDrafts.id, id)).returning();
    return row ? { id: row.id, userId, sourceType: (row.sourceType ?? "airdrop") as DraftRow["sourceType"], sourceId: row.sourceId ?? "", templateId: row.templateId ?? "", generatedContent: row.generatedContent ?? "", editedContent: row.editedContent, status: row.status as DraftRow["status"], shareUrl: row.shareUrl, createdAt: row.createdAt.toISOString() } : null;
  }
  const s = getStore();
  const row = s.drafts.find((d) => d.id === id && d.userId === userId);
  if (!row) return null;
  Object.assign(row, patch);
  return row;
}

// ── Watchlists ──────────────────────────────────────────────────────────────
export async function getWatchlist(userId: string): Promise<WatchlistRow[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.watchlists).where(eq(schema.watchlists.userId, userId as never));
    return rows.map((r) => ({ id: r.id, userId, projectId: r.projectId ?? "", alertTriggers: r.alertTriggers ?? { sentinel: true, airdrop: true, pattern_match: true } }));
  }
  return getStore().watchlists.filter((w) => w.userId === userId);
}

export async function toggleWatch(userId: string, projectId: string, triggers: WatchlistRow["alertTriggers"]): Promise<WatchlistRow | null> {
  const db = getDb();
  if (db) {
    const [ex] = await db.select().from(schema.watchlists).where(and(eq(schema.watchlists.userId, userId as never), eq(schema.watchlists.projectId, projectId as never))).limit(1);
    if (ex) {
      await db.delete(schema.watchlists).where(eq(schema.watchlists.id, ex.id));
      return null;
    }
    const [row] = await db.insert(schema.watchlists).values({ userId: userId as never, projectId: projectId as never, alertTriggers: triggers }).returning();
    return { id: row.id, userId, projectId, alertTriggers: triggers };
  }
  const s = getStore();
  const existing = s.watchlists.find((w) => w.userId === userId && w.projectId === projectId);
  if (existing) {
    s.watchlists = s.watchlists.filter((w) => w.id !== existing.id);
    return null;
  }
  const row: WatchlistRow = { id: crypto.randomUUID(), userId, projectId, alertTriggers: triggers };
  s.watchlists.push(row);
  return row;
}

// ── Simulations ─────────────────────────────────────────────────────────────
export async function saveSimulation(args: { userId: string; projectId: string; variable: string; value: number; result: { expectedTvlPct: number; p10: number; p50: number; p90: number } }): Promise<SimulationRow> {
  const db = getDb();
  if (db) {
    const [row] = await db.insert(schema.simulations).values({
      userId: args.userId as never, projectId: args.projectId as never, variable: args.variable, value: String(args.value), result: args.result,
      shareToken: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    }).returning();
    return { id: row.id, userId: args.userId, projectId: args.projectId, variable: args.variable, value: args.value, result: args.result, shareToken: row.shareToken, createdAt: row.createdAt.toISOString() };
  }
  const s = getStore();
  const row: SimulationRow = { id: crypto.randomUUID(), userId: args.userId, projectId: args.projectId, variable: args.variable, value: args.value, result: args.result, shareToken: crypto.randomUUID().replace(/-/g, "").slice(0, 12), createdAt: new Date().toISOString() };
  s.simulations.unshift(row);
  return row;
}

export async function listSimulations(userId: string, projectId?: string): Promise<SimulationRow[]> {
  const db = getDb();
  if (db) {
    const rows = projectId
      ? await db.select().from(schema.simulations).where(eq(schema.simulations.projectId, projectId as never)).orderBy(desc(schema.simulations.createdAt))
      : await db.select().from(schema.simulations).orderBy(desc(schema.simulations.createdAt));
    return rows.map((r) => ({ id: r.id, userId: r.userId ?? userId, projectId: r.projectId ?? "", variable: r.variable, value: Number(r.value), result: r.result ?? { expectedTvlPct: 0, p10: 0, p50: 0, p90: 0 }, shareToken: r.shareToken, createdAt: r.createdAt.toISOString() }));
  }
  const s = getStore();
  return (projectId ? s.simulations.filter((x) => x.projectId === projectId) : s.simulations).map((r) => ({ ...r }));
}

// ── Usage & plan ────────────────────────────────────────────────────────────
export async function generationsUsedToday(userId: string): Promise<number> {
  const db = getDb();
  const day = new Date().toISOString().slice(0, 10);
  if (db) {
    const rows = await db.select().from(schema.usageEvents).where(eq(schema.usageEvents.userId, userId as never));
    return rows.filter((r) => r.createdAt.toISOString().slice(0, 10) === day).length;
  }
  return getStore().usageEvents.filter((u) => u.userId === userId && u.kind === "ai_generation" && u.createdAt.slice(0, 10) === day).length;
}

export async function recordGeneration(userId: string): Promise<void> {
  const db = getDb();
  if (db) {
    await db.insert(schema.usageEvents).values({ userId: userId as never, kind: "ai_generation" });
    return;
  }
  getStore().usageEvents.push({ id: crypto.randomUUID(), userId, kind: "ai_generation", createdAt: new Date().toISOString() });
}

// ── Audit log (append-only) ─────────────────────────────────────────────────
export async function appendAudit(entry: { actorId?: string; actorEmail?: string; action: string; resource?: string; meta?: Record<string, unknown>; ip?: string }): Promise<void> {
  const db = getDb();
  if (db) {
    await db.insert(schema.auditLogs).values(entry as never);
    return;
  }
  const s = getStore();
  s.auditLogs.unshift({ id: crypto.randomUUID(), ...entry, createdAt: new Date().toISOString() });
  if (s.auditLogs.length > 500) s.auditLogs.length = 500;
}

export async function listAudit(limit = 100) {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit);
    return rows.map((r) => ({ id: r.id, actorId: r.actorId, actorEmail: r.actorEmail, action: r.action, resource: r.resource, meta: r.meta, ip: r.ip, createdAt: r.createdAt.toISOString() }));
  }
  return getStore().auditLogs.slice(0, limit);
}

export function isDbMode(): boolean {
  return getDb() !== null;
}

export function logRepoMode(): void {
  logger.info("repo", isDbMode() ? "persistence: postgres/drizzle" : "persistence: in-memory (demo)");
}

// ── Calibration track record (§3.3) ─────────────────────────────────────────
export async function listCalibration() {
  return getStore().calibrationCalls.sort((a, b) => b.asOfDate.localeCompare(a.asOfDate));
}

export async function addCalibration(c: Omit<import("@/lib/domain").CalibrationCall, "id" | "outcome" | "gradedAt" | "gradedBy">) {
  const row: import("@/lib/domain").CalibrationCall = { ...c, id: crypto.randomUUID(), outcome: "pending", gradedAt: null, gradedBy: null };
  getStore().calibrationCalls.unshift(row);
  return row;
}

export async function gradeCalibration(id: string, outcome: "pass" | "fail" | "inconclusive", gradedBy: string) {
  const row = getStore().calibrationCalls.find((x) => x.id === id);
  if (!row) return null;
  row.outcome = outcome;
  row.gradedAt = new Date().toISOString();
  row.gradedBy = gradedBy;
  return row;
}

// ── Notifications (watchlist → alerts) ────────────────────────────────────────
export async function listNotifications(userId: string) {
  return getStore().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationsRead(userId: string) {
  for (const n of getStore().notifications) if (n.userId === userId) n.read = true;
}

export function pushNotification(n: Omit<import("@/lib/domain").NotificationRow, "id" | "read" | "createdAt">) {
  const row = { ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() };
  getStore().notifications.unshift(row);
  // Optional webhook adapter (Slack/Discord/custom) — fire-and-forget
  const url = process.env.WEBHOOK_URL;
  if (url) {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cif-webhook-secret": process.env.WEBHOOK_SECRET ?? "" },
      body: JSON.stringify({ event: "notification", ...row }),
    }).catch(() => {});
  }
}

// ── OAuth (Google) user provisioning ─────────────────────────────────────────
export async function findOrCreateOAuthUser(profile: { email: string; name: string; provider: string; sub: string }) {
  const s = getStore();
  const email = profile.email.toLowerCase();
  let u = s.users.find((x) => x.email === email);
  if (!u) {
    u = { id: `u-${crypto.randomUUID().slice(0, 8)}`, email, name: profile.name || email.split("@")[0], plan: "free", role: "viewer", passwordHash: null };
    s.users.push(u);
    await appendAudit({ actorId: u.id, actorEmail: email, action: "user.provision", meta: { provider: profile.provider, sub: profile.sub } });
  }
  return u;
}

// ── Brief quota (value-units pricing: Free = 1 brief/hari) ───────────────────
export async function briefsToday(userId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  return getStore().usageEvents.filter((u) => u.userId === userId && u.kind === "brief_view" && u.createdAt.slice(0, 10) === day).length;
}
export async function recordBrief(userId: string): Promise<void> {
  getStore().usageEvents.push({ id: crypto.randomUUID(), userId, kind: "brief_view", createdAt: new Date().toISOString() });
}

// ── Instrumentation (value-delivered metrics) ─────────────────────────────────
export function trackEvent(event: string, meta?: Record<string, unknown>) {
  const s = getStore();
  s.trackEvents.unshift({ id: crypto.randomUUID(), event, meta: meta ?? {}, at: new Date().toISOString() });
  if (s.trackEvents.length > 2000) s.trackEvents.length = 2000;
}
export function metricsSummary() {
  const s = getStore();
  const count = (e: string) => s.trackEvents.filter((t) => t.event === e).length;
  const countMeta = (e: string, variant: string) =>
    s.trackEvents.filter((t) => t.event === e && (t.meta as { variant?: string })?.variant === variant).length;
  return {
    brief_views: count("brief_view_ui"),
    framing: {
      expose_A: countMeta("framing_expose", "A"),
      expose_B: countMeta("framing_expose", "B"),
      checkout_A: countMeta("checkout_start", "A"),
      checkout_B: countMeta("checkout_start", "B"),
    },
    exports: count("export"),
    shares: count("share"),
    watches: count("watch"),
    generations: count("generate"),
    total: s.trackEvents.length,
  };
}
