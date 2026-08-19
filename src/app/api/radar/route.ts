import { NextResponse } from "next/server";
import { computeRadar } from "@/services/market/radar";
import { listCalibration } from "@/lib/repo";
import { getStore } from "@/lib/store";
import { patternActivations } from "@/services/vectors";
import { binancePerp } from "@/services/market/gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/radar — Edge Radar + morning deltas + density sections (home). */
export async function GET() {
  const s = getStore();
  const radar = await computeRadar();
  const watched = new Set(s.watchlists.map((w) => w.projectId));
  const byId = new Map(s.projects.map((p) => [p.id, p]));
  const watchedAlerts = s.alerts
    .filter((a) => !a.resolved && watched.has(a.projectId))
    .slice(0, 6)
    .map((a) => ({ ...a, projectName: byId.get(a.projectId)?.name ?? "?" }));
  const ranked = [...s.projects]
    .filter((p) => p.hero || p.isDemo)
    .map((p) => {
      const ser = p.series;
      const m30 = Math.round((ser[ser.length - 1].tvl / Math.max(1, ser[0].tvl) - 1) * 1000) / 10;
      const acts = patternActivations(s, p);
      const score = Math.round((0.5 * Math.max(-1, Math.min(1, m30 / 20)) + 0.3 * p.sentiment + 0.2 * Math.max(...acts)) * 100) / 100;
      return { slug: p.slug, name: p.name, m30, score, tvl: p.tvlUsd, category: p.category };
    })
    .sort((a, b) => b.score - a.score);
  const movers = ranked.slice(0, 5);

  // density: stats, unlocks radar, pattern heat, funding (external when reachable)
  const totalTvl = s.projects.reduce((a, p) => a + p.tvlUsd, 0);
  const activeAlerts = s.alerts.filter((a) => !a.resolved).length;
  const cal = await listCalibration();
  const resolved = cal.filter((c) => c.outcome !== "pending");
  const calScore = resolved.length ? Math.round((resolved.filter((c) => c.outcome === "pass").length / resolved.length) * 100) : null;

  const unlockIdx = s.patterns.findIndex((x) => x.slug === "unlock-overhang");
  const unlocks = s.projects
    .filter((p) => p.hero || p.isDemo)
    .map((p) => ({ p, a: patternActivations(s, p)[unlockIdx] ?? 0 }))
    .filter((x) => x.a >= 0.35)
    .sort((a, b) => b.a - a.a)
    .slice(0, 5)
    .map((x) => ({ slug: x.p.slug, name: x.p.name, severity: x.a }));

  const patternHeat = s.patterns
    .map((pat, i) => ({
      name: pat.name,
      active: s.projects.filter((p) => (p.hero || p.isDemo) && patternActivations(s, p)[i] >= 0.4).length,
    }))
    .filter((x) => x.active > 0)
    .sort((a, b) => b.active - a.active)
    .slice(0, 8);

  const fundingSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "HYPEUSDT", "BLURUSDT", "ARBUSDT", "ENAUSDT"];
  const funding: { symbol: string; funding: number; mark: number }[] = [];
  for (const sym of fundingSymbols) {
    const f = await binancePerp(sym);
    if (f) funding.push({ symbol: sym, funding: f.funding, mark: f.mark });
  }

  return NextResponse.json({
    radar,
    watchedAlerts,
    movers,
    calibration: cal.slice(0, 3),
    stats: { universeTvl: totalTvl, activeAlerts, calibrationScore: calScore, projects: s.projects.length },
    unlocks,
    patternHeat,
    funding,
    todaysPick: ranked[0] ?? null,
    asOf: new Date().toISOString(),
  });
}
