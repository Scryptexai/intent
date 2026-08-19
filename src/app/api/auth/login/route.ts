import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/repo";
import { signSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
import { appendAudit, clientIpGuard } from "@/lib/repo-audit-helper";

const Body = z.object({ email: z.string().email().max(255), password: z.string().min(8).max(128) });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    await appendAudit({ actorEmail: parsed.data.email, action: "login.failed", ip: req.headers.get("x-forwarded-for") ?? undefined });
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  const token = await signSession({ uid: user.id, email: user.email, role: user.role, plan: user.plan, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  await appendAudit({ actorId: user.id, actorEmail: user.email, action: "login", ip: req.headers.get("x-forwarded-for") ?? undefined });
  return res;
}
