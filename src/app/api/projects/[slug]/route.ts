import { NextResponse } from "next/server";
import { getProjectDetail } from "@/services/project-detail";
import { generateIntelBrief } from "@/services/value-translation";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[slug] — project + metrics + summary + Intel Brief
 * (Value Translation Layer: insight, bukan hanya angka).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const d = getProjectDetail(slug);
    const coverage = Math.min(100, Math.round(d.knowledge.total * 4));
    const intelBrief = generateIntelBrief(
      {
        id: d.project.id ?? "",
        slug: d.project.slug,
        name: d.project.name,
        category: d.project.category,
        description: d.project.description,
        tvlUsd: d.project.tvlUsd,
        volume24hUsd: d.project.volume24hUsd,
        sentiment: d.project.sentiment,
        launchDate: d.project.launchDate,
        tokenSymbol: d.project.tokenSymbol,
        isDemo: false,
        hero: true,
        series: seriesOf(slug),
      },
      d.cifScore,
      coverage,
    );
    return NextResponse.json({
      ...d,
      metrics: {
        tvl: d.project.tvlUsd,
        volume24h: d.project.volume24hUsd,
        momentum30d: d.project.tvl30dPct,
        sentiment: d.project.sentiment,
        coverage,
      },
      summary: intelBrief.oneLiner,
      intelBrief,
    });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "DETAIL_FAILED" }, { status: 500 });
  }
}

function seriesOf(slug: string) {
  const s = getStore().projects.find((p) => p.slug === slug || p.id === slug);
  return s?.series ?? [];
}

import { getStore } from "@/lib/store";
