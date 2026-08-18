import { NextRequest, NextResponse } from "next/server";
import { runSimulation, SIM_VARIABLES } from "@/services/simulator";
import { simRecommendation } from "@/services/value-translation";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";

/** GET /api/edge/simulate?projectId=&variable=&value= — Monte-Carlo distribution. */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const variable = req.nextUrl.searchParams.get("variable");
  const value = Number(req.nextUrl.searchParams.get("value") ?? NaN);
  if (!projectId || !variable || Number.isNaN(value)) {
    return NextResponse.json({ error: "projectId, variable & value required", variables: SIM_VARIABLES }, { status: 400 });
  }
  try {
    const r = runSimulation(projectId, variable, value);
    return NextResponse.json({ ...r, recommendation: simRecommendation(variable, r.percentiles.p50, r.percentiles.p10, r.percentiles.p90) });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "SIM_FAILED" }, { status: 500 });
  }
}
