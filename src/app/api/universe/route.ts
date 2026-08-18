import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { patternActivations } from "@/services/vectors";
import { getSession } from "@/lib/auth/guard";
import { effectivePlan } from "@/services/billing";
import { atLeast, MARKETS, type MarketId } from "@/lib/domain";
import { marketRows } from "@/lib/data/markets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/universe?market=crypto|stocks|ai|commodities&sort=…&q=…
 * Kripto terbuka untuk semua tier; market lain (Ultimate) di-gate server-side.
 */
export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get("market") ?? "crypto") as MarketId;
  const sort = req.nextUrl.searchParams.get("sort") ?? "score";
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  // pagination: ringan walau ribuan row — client minta per halaman
  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);

  if (!MARKETS.some((m) => m.id === market)) {
    return NextResponse.json({ error: "UNKNOWN_MARKET" }, { status: 400 });
  }

  if (market !== "crypto") {
    const s = await getSession(req);
    const plan = s ? effectivePlan(s.uid) : "free";
    if (!atLeast(plan, "ultimate")) {
      return NextResponse.json({ error: "ULTIMATE_REQUIRED", market }, { status: 403 });
    }
  }

  if (market !== "crypto") {
    let rows = marketRows(market)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .map((r) => ({ slug: r.slug, name: r.name, category: r.category, ticker: r.ticker, tvl: r.valueUsd, vol: r.vol, m30: r.m30, sentiment: r.sentiment, score: r.score, watched: false }));
    rows.sort((a, b) => (sort === "momentum" ? b.m30 - a.m30 : sort === "tvl" ? b.tvl - a.tvl : b.score - a.score));
    return NextResponse.json({ rows: rows.slice(offset, offset + limit), total: rows.length, market });
  }

  const s = getStore();
  const watched = new Set(s.watchlists.map((w) => w.projectId));

  const rows = s.projects
    .filter((p) => p.hero || p.isDemo)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    .map((p) => {
      const ser = p.series;
      const m30 = Math.round((ser[ser.length - 1].tvl / Math.max(1, ser[0].tvl) - 1) * 1000) / 10;
      const acts = patternActivations(s, p);
      const hot = Math.max(...acts);
      const score = Math.round((0.5 * Math.max(-1, Math.min(1, m30 / 20)) + 0.3 * p.sentiment + 0.2 * hot) * 100) / 100;
      return {
        slug: p.slug, name: p.name, category: p.category,
        tvl: p.tvlUsd, vol: p.volume24hUsd, m30, sentiment: p.sentiment, score,
        watched: watched.has(p.id),
      };
    });

  rows.sort((a, b) => (sort === "momentum" ? b.m30 - a.m30 : sort === "tvl" ? b.tvl - a.tvl : b.score - a.score));
  return NextResponse.json({ rows: rows.slice(offset, offset + limit), total: rows.length, market: "crypto" });
}
