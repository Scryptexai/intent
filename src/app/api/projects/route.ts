import { NextRequest, NextResponse } from "next/server";
import { getStore, getUser } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects?hero=1&category=L2 — universe listing with plan gating metadata. */
export async function GET(req: NextRequest) {
  const s = getStore();
  const user = getUser();
  const hero = req.nextUrl.searchParams.get("hero") === "1";
  const category = req.nextUrl.searchParams.get("category");
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase();

  let projects = s.projects;
  if (hero) projects = projects.filter((p) => p.hero);
  if (category) projects = projects.filter((p) => p.category === category);
  if (q) projects = projects.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q));

  const rows = projects.slice(0, 100).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    tvlUsd: p.tvlUsd,
    volume24hUsd: p.volume24hUsd,
    sentiment: p.sentiment,
    tokenSymbol: p.tokenSymbol,
    hero: p.hero,
    locked: user.plan === "free" && !p.isDemo,
  }));

  return NextResponse.json({ projects: rows, total: projects.length, plan: user.plan });
}
