import { NextRequest, NextResponse } from "next/server";
import { metricsSummary, requireRole } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/metrics — admin-only value-delivered metrics. */
export async function GET(req: NextRequest) {
  const s = await requireRole(req, "admin");
  if (!s) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json(metricsSummary());
}
