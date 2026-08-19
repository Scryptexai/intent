import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";
import { getStore } from "@/lib/store";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/x/callback — exchange code (PKCE) and store the token server-side. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const pkce = req.cookies.get("x_pkce")?.value;
  if (!code || !state || !pkce) return NextResponse.json({ error: "BAD_CALLBACK" }, { status: 400 });
  const [pkState, verifier] = pkce.includes(".") ? [pkce.split(".")[0], pkce.split(".")[1]] : [null, null];
  if (!code || !state || pkState !== state || !verifier) return NextResponse.json({ error: "STATE_MISMATCH" }, { status: 400 });

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "X_OAUTH_NOT_CONFIGURED" }, { status: 501 });

  try {
    const res = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${req.nextUrl.origin}/api/x/callback`, code_verifier: verifier }),
    });
    const d = await res.json();
    if (!res.ok || !d.access_token) return NextResponse.json({ error: "TOKEN_EXCHANGE_FAILED", detail: d }, { status: 502 });
    getStore().xTokens.set(s.uid, { accessToken: d.access_token, obtainedAt: new Date().toISOString() });
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "x.connect" });
    const back = NextResponse.redirect(`${req.nextUrl.origin}/studio`);
    back.cookies.set("x_pkce", "", { maxAge: 0, path: "/" });
    return back;
  } catch {
    return NextResponse.json({ error: "X_API_UNREACHABLE", message: "Network to api.x.com failed from this host." }, { status: 502 });
  }
}
