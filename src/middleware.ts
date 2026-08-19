import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Edge middleware — enterprise guard layer:
 *  - sliding-window rate limit on mutating endpoints (per IP; upgrade to
 *    Upstash at the edge for multi-instance strictness, see SECURITY.md)
 *  - session required for all user writes (routes re-check RBAC roles)
 *  - same-origin Origin check (CSRF) for cookie-authenticated mutations
 * Exempt: auth endpoints, public reads, cron endpoints (Bearer CRON_SECRET),
 * /api/v1 (API-key auth), /api/health.
 */

const RATE = { windowMs: 60_000, max: 60 };
const buckets = new Map<string, { t: number; n: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.t > RATE.windowMs) {
    buckets.set(ip, { t: now, n: 1 });
    return false;
  }
  b.n += 1;
  return b.n > RATE.max;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return NextResponse.next();

  // exempt paths
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/v1/") ||
    pathname === "/api/health" ||
    pathname === "/api/sentinel/run" ||
    pathname === "/api/narratives/refresh" ||
    pathname === "/api/billing/stripe/webhook" ||
    pathname === "/api/billing/paypal/webhook" ||
    pathname === "/api/simulate" ||
    pathname.startsWith("/api/support")
  ) {
    return NextResponse.next();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(`${ip}:${pathname}`)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many requests." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // instrumentation anon (discovery A/B) — tetap rate-limited
  if (pathname === "/api/track") return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in required." }, { status: 401 });
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.nextUrl.host) {
        return NextResponse.json({ error: "CSRF_REJECTED" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "CSRF_REJECTED" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
