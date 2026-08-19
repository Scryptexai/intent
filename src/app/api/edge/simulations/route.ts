import { NextRequest, NextResponse } from "next/server";
import { runSimulation } from "@/services/simulator";
import { listSimulations, saveSimulation, getSession, requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";
import { ServiceError } from "@/services/logger";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/edge/simulations?projectId= — saved sims (signed-in). */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const sims = await listSimulations(s.uid, projectId);
  const byId = new Map(getStore().projects.map((p) => [p.id, p]));
  return NextResponse.json({ simulations: sims.map((r) => ({ ...r, projectName: byId.get(r.projectId)?.name ?? "?" })) });
}

/** POST /api/edge/simulations — "Apply Simulation" (analyst+), persisted. */
export async function POST(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await getSession(req);
    return any ? forbidden() : unauthorized();
  }
  const body = await req.json().catch(() => null);
  if (!body?.projectId || !body?.variable || typeof body?.value !== "number") {
    return NextResponse.json({ error: "projectId, variable & value required" }, { status: 400 });
  }
  try {
    const result = runSimulation(body.projectId, body.variable, body.value);
    const row = await saveSimulation({ userId: s.uid, projectId: result.projectId, variable: body.variable, value: result.value, result: { expectedTvlPct: result.expected.tvlPct, p10: result.percentiles.p10, p50: result.percentiles.p50, p90: result.percentiles.p90 } });
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "sim.save", resource: `${body.variable}=${body.value}` });
    return NextResponse.json({ simulation: row }, { status: 201 });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}
