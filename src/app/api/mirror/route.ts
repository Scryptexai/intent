import { NextRequest, NextResponse } from "next/server";
import { findAnalogProject } from "@/services/similarity-engine";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";

/** GET /api/mirror?projectId=p-blur&topN=3 — The Mirror: analog projects. */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const topN = Math.min(30, Number(req.nextUrl.searchParams.get("topN") ?? 3));
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  try {
    return NextResponse.json(findAnalogProject(projectId, topN));
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "MIRROR_FAILED" }, { status: 500 });
  }
}
