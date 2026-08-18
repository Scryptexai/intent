import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert } from "@/services/anomaly-detection";
import { getSession, appendAudit } from "@/lib/repo-auth";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/anomalies/[id]/acknowledge — mark exception as seen (analyst+). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(req);
  if (!s || s.role === "viewer") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  try {
    const alert = acknowledgeAlert(id);
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "anomaly.ack", resource: id });
    return NextResponse.json({ acknowledged: true, alert });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "ACK_FAILED" }, { status: 500 });
  }
}
