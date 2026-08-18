import { NextRequest, NextResponse } from "next/server";
import { addBranch, getDecisionChain } from "@/services/decision-chain";
import { criticalPath } from "@/services/value-translation";
import { ServiceError } from "@/services/logger";
import { requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";

export const runtime = "nodejs";

/** GET /api/multiverse?projectId= — causal graph for React Flow. */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    const chain = getDecisionChain(projectId);
    return NextResponse.json({ ...chain, criticalPath: criticalPath(chain.nodes) });
  } catch (e) {
    // empty = honest (P6): kembalikan graph kosong, BUKAN error — UI tampilkan empty-state
    if (e instanceof ServiceError && e.code === "CHAIN_EMPTY") {
      return NextResponse.json({ nodes: [], edges: [], criticalPath: null });
    }
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "CHAIN_FAILED" }, { status: 500 });
  }
}

/** POST /api/multiverse — add a counter-factual "what-if" branch (analyst+). */
export async function POST(req: NextRequest) {
  const session = await requireRole(req, "analyst");
  if (!session) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden() : unauthorized();
  }
  const body = await req.json().catch(() => null);
  if (!body?.projectId || !body?.title) return NextResponse.json({ error: "projectId & title required" }, { status: 400 });
  try {
    const node = addBranch({
      projectId: body.projectId,
      parentId: body.parentId ?? null,
      title: body.title,
      probability: typeof body.probability === "number" ? body.probability : 0.3,
    });
    await appendAudit({ actorId: session.uid, actorEmail: session.email, action: "branch.add", resource: node.id, meta: { title: node.title.slice(0, 80) } });
    return NextResponse.json({ node }, { status: 201 });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "BRANCH_FAILED" }, { status: 500 });
  }
}
