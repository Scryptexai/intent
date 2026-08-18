import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, appendAudit } from "@/lib/repo-auth";
import { getStore } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete — GDPR right-to-erasure: purge own rows
 * (drafts, watchlist, sims, notifications) and end the session.
 */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const store = getStore();
  store.drafts = store.drafts.filter((d) => d.userId !== s.uid);
  store.watchlists = store.watchlists.filter((w) => w.userId !== s.uid);
  store.simulations = store.simulations.filter((x) => x.userId !== s.uid);
  store.notifications = store.notifications.filter((n) => n.userId !== s.uid);
  store.usageEvents = store.usageEvents.filter((u) => u.userId !== s.uid);
  await appendAudit({ actorEmail: s.email, action: "account.delete", meta: { note: "rows purged; user record retained for audit compliance" } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
