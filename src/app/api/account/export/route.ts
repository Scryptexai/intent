import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, listDrafts, getWatchlist, listSimulations, listNotifications, appendAudit } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/account/export — GDPR data portability: dump own data as JSON. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "account.export" });
  return NextResponse.json({
    account: { email: s.email, role: s.role, plan: s.plan },
    drafts: await listDrafts(s.uid),
    watchlist: await getWatchlist(s.uid),
    simulations: await listSimulations(s.uid),
    notifications: await listNotifications(s.uid),
    exportedAt: new Date().toISOString(),
  });
}
