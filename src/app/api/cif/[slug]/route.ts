import { NextResponse } from "next/server";
import { getCifDataset, cifDossier } from "@/services/cif-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cif/[slug] — full locked-schema dossier for one project. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getCifDataset();
  const dossier = cifDossier(d, slug);
  if (!dossier) return NextResponse.json({ error: "NOT_IN_CIF_CATALOG", message: `Project '${slug}' is not part of the locked INTENT catalog.` }, { status: 404 });
  return NextResponse.json(dossier);
}
