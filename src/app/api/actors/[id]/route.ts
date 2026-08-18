import { NextResponse } from "next/server";
import { actorClaims, getActorCredibility } from "@/services/actor-credibility";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";

/** GET /api/actors/[id] — full claim history for the detail modal. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = getActorCredibility(id);
    const report = {
      id: r.entity.id,
      name: r.entity.name,
      kind: r.entity.kind,
      reliability: r.reliability,
      hitRate: r.hitRate,
      resolvedCalls: r.resolvedCalls,
      pendingCalls: r.pendingCalls,
      flags: r.flags,
    };
    return NextResponse.json({ report, claims: actorClaims(id) });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "ACTOR_FAILED" }, { status: 500 });
  }
}
