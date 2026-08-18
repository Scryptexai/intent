import { NextRequest, NextResponse } from "next/server";
import { findOrCreateOAuthUser, appendAudit } from "@/lib/repo";
import { signSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/google/callback — exchange code (PKCE), provision user, sign session. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get("error");
  if (error) return NextResponse.redirect(`${origin}/login?error=google_${error}`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const pkce = req.cookies.get("g_pkce")?.value;
  if (!code || !state || !pkce) return NextResponse.redirect(`${origin}/login?error=google_bad_callback`);
  const [pkState, verifier] = pkce.includes(".") ? [pkce.split(".")[0], pkce.split(".")[1]] : [null, null];
  if (pkState !== state || !verifier) return NextResponse.redirect(`${origin}/login?error=google_state_mismatch`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${origin}/login?error=google_not_configured`);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) {
      return NextResponse.redirect(`${origin}/login?error=google_token_failed`);
    }

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const info = await infoRes.json();
    if (!infoRes.ok || !info?.email) {
      return NextResponse.redirect(`${origin}/login?error=google_userinfo_failed`);
    }

    const user = await findOrCreateOAuthUser({ email: info.email, name: info.name ?? "", provider: "google", sub: info.sub ?? info.email });
    const session = await signSession({ uid: user.id, email: user.email, role: user.role, plan: user.plan, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
    await appendAudit({ actorId: user.id, actorEmail: user.email, action: "login.google" });

    const res = NextResponse.redirect(`${origin}/`);
    res.cookies.set("g_pkce", "", { maxAge: 0, path: "/" });
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 86400,
    });
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=google_unreachable`);
  }
}
