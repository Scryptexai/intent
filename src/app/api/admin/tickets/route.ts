import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/repo-auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/tickets — escalated support tickets (admin). */
export async function GET(req: NextRequest) {
  const s = await requireRole(req, "admin");
  if (!s) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json({ tickets: getStore().tickets });
}
