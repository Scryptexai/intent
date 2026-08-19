import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/events?projectId&type&from&to */
export async function GET(req: NextRequest) {
  const s = getStore();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const type = req.nextUrl.searchParams.get("type");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  let rows = s.events;
  if (projectId) rows = rows.filter((e) => e.projectId === projectId);
  if (type) rows = rows.filter((e) => e.kind === type);
  if (from) rows = rows.filter((e) => e.occurredAt >= from);
  if (to) rows = rows.filter((e) => e.occurredAt <= to);
  return NextResponse.json({ events: rows, total: rows.length });
}
