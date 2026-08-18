import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gradeCalibration, requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ outcome: z.enum(["pass", "fail", "inconclusive"]) });

/** POST — grade a resolved call publicly (analyst+), either way. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden() : unauthorized();
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const row = await gradeCalibration(id, parsed.data.outcome, s.uid);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "calibration.grade", resource: id, meta: { outcome: parsed.data.outcome } });
  return NextResponse.json({ call: row });
}
