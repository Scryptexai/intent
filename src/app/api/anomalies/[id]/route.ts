import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert, getAnomalyDetail } from "@/services/anomaly-detection";
import { ServiceError } from "@/services/logger";
import { requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/anomalies/[id] — detail payload for the side panel (public read). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(getAnomalyDetail(id));
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "DETAIL_FAILED" }, { status: 500 });
  }
}

/** POST /api/anomalies/[id] — acknowledge (analyst+), audited. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden() : unauthorized();
  }
  const { id } = await params;
  try {
    const alert = acknowledgeAlert(id);
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "anomaly.ack", resource: id });
    return NextResponse.json({ acknowledged: true, alert });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "ACK_FAILED" }, { status: 500 });
  }
}
