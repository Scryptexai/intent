import { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE, type SessionPayload } from "@/lib/auth/session";
import { createHash } from "node:crypto";
import { getStore } from "@/lib/store";

/** Server-side (Node runtime) auth guards used by API routes. */

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function unauthorized(): Response {
  return Response.json({ error: "UNAUTHORIZED", message: "Sign in required." }, { status: 401 });
}
export function forbidden(msg = "Insufficient role."): Response {
  return Response.json({ error: "FORBIDDEN", message: msg }, { status: 403 });
}

export type MinRole = "viewer" | "analyst" | "admin";
const LEVEL: Record<MinRole, number> = { viewer: 0, analyst: 1, admin: 2 };

/** Returns session if authenticated AND role >= min, else null. */
export async function requireRole(req: NextRequest, min: MinRole): Promise<SessionPayload | null> {
  const s = await getSession(req);
  if (!s) return null;
  return LEVEL[s.role] >= LEVEL[min] ? s : null;
}

/** CSRF: same-origin Origin required for cookie-authenticated mutations. */
export function csrfOk(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, servers, API keys)
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

/**
 * Cron auth: Bearer CRON_SECRET (Vercel Cron) or privileged session.
 * Without CRON_SECRET (demo) an analyst/admin session suffices; in production
 * always set CRON_SECRET so unauthenticated schedulers still work via Bearer.
 */
export async function cronAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && bearer === secret) return true;
  const s = await getSession(req);
  if (secret) return s?.role === "admin";
  return Boolean(s && (s.role === "admin" || s.role === "analyst"));
}

/** Programmatic API key (x-cif-key header) with read scope. */
export function apiKeyValid(req: NextRequest): boolean {
  const raw = req.headers.get("x-cif-key");
  if (!raw) return false;
  const hash = createHash("sha256").update(raw).digest("hex");
  const k = getStore().apiKeys.find((x) => x.keyHash === hash && !x.revoked);
  return Boolean(k && k.scopes.includes("read"));
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
