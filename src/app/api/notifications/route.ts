import { NextRequest, NextResponse } from "next/server";
import { listNotifications, markNotificationsRead, getSession, unauthorized, appendAudit } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notifications — own notification feed. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const rows = await listNotifications(s.uid);
  return NextResponse.json({ notifications: rows, unread: rows.filter((r) => !r.read).length });
}

/** POST /api/notifications/read — mark all read. */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  await markNotificationsRead(s.uid);
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "notifications.read" });
  return NextResponse.json({ ok: true });
}
