import { NextResponse } from "next/server";
import { getTruthMatrix, topGapNarratives } from "@/services/truth-matrix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/narratives — dynamic Truth Matrix (narratives + evidence cells). */
export async function GET() {
  const matrix = getTruthMatrix();
  return NextResponse.json({ matrix, gaps: topGapNarratives(3) });
}
