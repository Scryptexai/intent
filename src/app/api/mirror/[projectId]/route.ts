import { NextResponse } from "next/server";
import { findAnalogProject } from "@/services/similarity-engine";
import { generateMirrorVerdict } from "@/services/value-translation";
import { patternActivations } from "@/services/vectors";
import { getStore } from "@/lib/store";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/mirror/[projectId] — target, analogs, verdict + radar vectors. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const r = findAnalogProject(projectId, 3);
    const verdict = generateMirrorVerdict(r.analogs, r.target);
    const s = getStore();
    const axes = s.patterns.map((p) => p.name);
    const targetVec = patternActivations(s, r.target);
    const analogVec = r.analogs[0] ? patternActivations(s, r.analogs[0].project) : targetVec;
    return NextResponse.json({ target: r.target, analogs: r.analogs, verdict, scanned: r.scannedProjects, radar: { axes, target: targetVec, analog: analogVec } });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "MIRROR_FAILED" }, { status: 500 });
  }
}
