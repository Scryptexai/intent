import { NextRequest, NextResponse } from "next/server";
import { listAudit, requireRole, unauthorized, forbidden } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/audit?limit= — admin-only immutable audit trail. */
export async function GET(req: NextRequest) {
  const s = await requireRole(req, "admin");
  if (!s) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden("Admin role required.") : unauthorized();
  }
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit") ?? 100));
  return NextResponse.json({ audit: await listAudit(limit) });
}
