import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/guard";
import { appendAudit } from "@/lib/repo";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const s = await getSession(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  if (s) await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "logout" });
  return res;
}
