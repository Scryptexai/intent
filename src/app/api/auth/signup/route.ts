import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { hashPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
});

/**
 * POST /api/auth/signup — buat akun (role viewer, plan free + trial Pro 30 hari
 * aktif otomatis saat subscription pertama dibaca). Session langsung aktif.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY", hint: "password minimal 8 karakter" }, { status: 400 });
  const s = getStore();
  const email = parsed.data.email.toLowerCase();
  if (s.users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "EMAIL_EXISTS", message: "Email sudah terdaftar — silakan sign in." }, { status: 409 });
  }
  const user = {
    id: `u-${Math.random().toString(36).slice(2, 10)}`,
    email,
    name: parsed.data.name ?? email.split("@")[0],
    plan: "free" as const,
    role: "viewer" as const,
    passwordHash: hashPassword(parsed.data.password),
  };
  s.users.push(user);
  await appendAudit({ actorId: user.id, actorEmail: email, action: "auth.signup" });
  const token = await signSession({ uid: user.id, email, role: user.role, plan: user.plan, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
  const res = NextResponse.json({ user: { id: user.id, email, name: user.name, role: user.role, plan: user.plan, trial: "30 hari Pro aktif otomatis" } }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
  return res;
}
