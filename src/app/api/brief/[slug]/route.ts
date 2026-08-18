import { NextRequest, NextResponse } from "next/server";
import { getProjectDetail } from "@/services/project-detail";
import { buildPremiumBrief } from "@/services/decision-brief";
import { generateIntelBrief } from "@/services/value-translation";
import { listCalibration, briefsToday, recordBrief, getSession } from "@/lib/repo-auth";
import { effectivePlan, FREE_BRIEFS_PER_DAY } from "@/services/billing";
import { patternActivations } from "@/services/vectors";
import { getCifDataset, cifDossier } from "@/services/cif-loader";
import { getStore } from "@/lib/store";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/brief/[slug] — Premium Decision Brief (docs/PRODUCT-DIRECTION.md).
 * Trust-depth (decision, read 3-dimensi, evidence ledger, unknowns, gates)
 * TIDAK dipaywall; lapisan interpretasi (intel, why, analogs, red team)
 * = scope berbayar. Free: 1 brief/hari untuk lapisan interpretasi.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession(req);
  const uid = session?.uid ?? "anon";
  const plan = session ? effectivePlan(session.uid) : "free";

  let detail: ReturnType<typeof getProjectDetail>;
  try {
    detail = getProjectDetail(slug);
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: 404 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const s = getStore();
  const project = s.projects.find((p) => p.slug === slug || p.id === slug)!;
  const brief = await buildPremiumBrief(project);
  const cif = cifDossier(await getCifDataset(), slug);

  const quota = await briefsToday(uid);
  const overQuota = plan === "free" && quota >= FREE_BRIEFS_PER_DAY;

  if (overQuota) {
    return NextResponse.json(
      {
        locked: true,
        quota,
        plan,
        project: detail.project,
        cifScore: detail.cifScore,
        brief, // bukti & disiplin keputusan tetap gratis
        upgrade: "/upgrade",
      },
      { status: 402 },
    );
  }
  await recordBrief(uid);

  // lapisan interpretasi (premium scope)
  const acts = patternActivations(s, project);
  const topPatterns = s.patterns
    .map((p, i) => ({ slug: p.slug, name: p.name, activation: acts[i] ?? 0 }))
    .filter((x) => x.activation >= 0.3)
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 3);
  const intel = generateIntelBrief(project, Math.round(detail.cifScore), cif ? 100 : 40);
  const why = topPatterns.map((t) => ({
    name: t.name,
    activation: t.activation,
    instances: null as number | null,
    confidence: null as string | null,
    scope: null as string | null,
    prediction: null as string | null,
  }));
  const cal = (await listCalibration()).filter((c) => c.projectId === project.id);

  return NextResponse.json({
    locked: false,
    plan,
    project: detail.project,
    cifScore: detail.cifScore,
    brief,
    intel,
    why,
    trackRecord: cal.map((c) => ({ statement: c.statement, outcome: c.outcome, asOf: c.asOfDate })),
    actions: {
      watch: `/universe`,
      simulate: `/edge`,
      studio: `/studio?sourceType=airdrop&sourceId=${project.id}`,
      memo: `/print/${project.slug}`,
      tools: { mirror: `/mirror?projectId=${project.id}`, multiverse: `/multiverse?projectId=${project.id}`, origin: `/origin` },
    },
  });
}
