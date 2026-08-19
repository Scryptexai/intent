import { NextRequest, NextResponse } from "next/server";
import { apiKeyValid } from "@/lib/auth/guard";
import { getProjectDetail } from "@/services/project-detail";
import { getCifDataset, cifDossier } from "@/services/cif-loader";
import { appendAudit } from "@/lib/repo";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/projects/[slug] — structured dossier (x-cif-key, scope read). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!apiKeyValid(req)) return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
  const { slug } = await params;
  try {
    const detail = getProjectDetail(slug);
    const dossier = cifDossier(await getCifDataset(), slug);
    await appendAudit({ actorEmail: "api-key", action: "api.v1.dossier", resource: slug });
    return NextResponse.json({
      schema: "cif-intent/v1",
      project: detail.project,
      cifScore: detail.cifScore,
      decisionEvents: dossier?.decisionEvents ?? [],
      knowledge: (dossier?.knowledge ?? []).map((k) => ({ name: k.name, category: k.category, confidence: k.confidence, evidenceText: k.evidenceText })),
      conflicts: dossier?.conflicts ?? [],
      qa: dossier?.qa ?? null,
    });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
