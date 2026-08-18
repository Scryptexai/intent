import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/knowledge?projectId&status&limit */
export async function GET(req: NextRequest) {
  const s = getStore();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? 50));
  let rows = s.knowledge;
  if (projectId) rows = rows.filter((k) => k.projectId === projectId);
  if (status) rows = rows.filter((k) => (status === "stable" ? k.confidence >= 0.75 : status === "emerging" ? k.confidence >= 0.5 && k.confidence < 0.75 : k.confidence < 0.5));
  return NextResponse.json({ knowledge: rows.slice(0, limit), total: rows.length });
}
