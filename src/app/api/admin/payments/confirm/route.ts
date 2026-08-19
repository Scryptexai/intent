import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, forbidden, unauthorized, appendAudit } from "@/lib/repo-auth";
import { confirmPayment } from "@/services/billing";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ paymentId: z.string().max(64), txHash: z.string().min(8).max(200) });

/** POST — admin manual confirmation of crypto payments. */
export async function POST(req: NextRequest) {
  const s = await requireRole(req, "admin");
  if (!s) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden() : unauthorized();
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const pay = confirmPayment(parsed.data.paymentId, parsed.data.txHash);
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "payment.confirm", resource: pay.id, meta: { txHash: parsed.data.txHash.slice(0, 20) } });
    return NextResponse.json({ payment: pay });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
