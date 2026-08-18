import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/x/auth — start X OAuth 2.0 PKCE (tweet.write scope).
 * Requires X_CLIENT_ID (+ secret for exchange). Stateless verifier cookie.
 */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "X_OAUTH_NOT_CONFIGURED", message: "Set X_CLIENT_ID & X_CLIENT_SECRET to enable Direct Post." }, { status: 501 });
  }
  const verifier = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const state = crypto.randomUUID();
  const redirectUri = `${req.nextUrl.origin}/api/x/callback`;
  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  const res = NextResponse.redirect(url);
  res.cookies.set("x_pkce", `${state}.${verifier}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
