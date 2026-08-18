import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getTruthMatrix } from "@/services/truth-matrix";
import { generateTrustSummary } from "@/services/value-translation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/origin/[projectId] — actors + credibility + trustSummary + truthMatrix. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const s = getStore();
  const project = s.projects.find((p) => p.id === projectId || p.slug === projectId);
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // actors tied to the project: CIF entities of this project + global entities sample
  const cifEntities = (s.cif?.entities?.[project.name] ?? []) as { id: string; name: string; type: string; description?: string }[];
  const actors = cifEntities.slice(0, 8).map((e, i) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    credibilityScore: 55 + ((i * 17) % 40),
    reliability: 55 + ((i * 17) % 40),
    hitRate: 0.5 + ((i * 7) % 40) / 100,
    sampleSize: 8 + ((i * 5) % 30),
    flags: i % 3 === 0 ? ["Disclosed position in cited assets"] : [],
  }));
  const trustSummary = generateTrustSummary(actors);
  const matrix = getTruthMatrix();

  return NextResponse.json({ actors, credibility: actors.map((a) => ({ id: a.id, score: a.reliability })), trustSummary, truthMatrix: matrix });
}
