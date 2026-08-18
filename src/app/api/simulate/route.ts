import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSimulation, SIM_VARIABLES } from "@/services/simulator";
import { simRecommendation } from "@/services/value-translation";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ projectId: z.string(), variable: z.string(), newValue: z.number() });

/** POST /api/simulate — distribution + recommendation (value translation). */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", variables: SIM_VARIABLES.map((v) => v.id) }, { status: 400 });
  try {
    const r = runSimulation(parsed.data.projectId, parsed.data.variable, parsed.data.newValue);
    return NextResponse.json({
      distribution: r.distribution,
      percentiles: r.percentiles,
      expected: r.expected,
      recommendation: simRecommendation(parsed.data.variable, r.percentiles.p50, r.percentiles.p10, r.percentiles.p90),
    });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "SIM_FAILED" }, { status: 500 });
  }
}
