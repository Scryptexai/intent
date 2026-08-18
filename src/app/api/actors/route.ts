import { NextResponse } from "next/server";
import { actorReports } from "@/services/actor-credibility";
import { generateTrustSummary } from "@/services/value-translation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/actors — dynamic credibility ledger. */
export async function GET() {
  const reports = actorReports();
  return NextResponse.json({
    trustSummary: generateTrustSummary(reports.map((r) => ({ name: r.entity.name, reliability: r.reliability, flags: r.flags }))),
    actors: reports.map((r) => ({
      id: r.entity.id,
      name: r.entity.name,
      kind: r.entity.kind,
      credibilityScore: r.entity.credibilityScore,
      reliability: r.reliability,
      hitRate: r.hitRate,
      resolvedCalls: r.resolvedCalls,
      pendingCalls: r.pendingCalls,
      flags: r.flags,
    })),
  });
}
