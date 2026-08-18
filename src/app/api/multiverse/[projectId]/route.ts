import { NextResponse } from "next/server";
import { getDecisionChain } from "@/services/decision-chain";
import { criticalPath } from "@/services/value-translation";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/multiverse/[projectId] — nodes, edges, criticalPath. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const chain = getDecisionChain(projectId);
    const cp = criticalPath(chain.nodes);
    return NextResponse.json({ nodes: chain.nodes, edges: chain.edges, criticalPath: cp });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "CHAIN_FAILED" }, { status: 500 });
  }
}
