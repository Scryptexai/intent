import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized, appendAudit } from "@/lib/repo-auth";
import { activatePaid, consumePendingTier } from "@/services/billing";
import { ServiceError } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ orderId: z.string().max(64) });

/** POST — capture an approved PayPal order → activate subscription. */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const cid = process.env.PAYPAL_CLIENT_ID;
  const csec = process.env.PAYPAL_CLIENT_SECRET;
  if (!cid || !csec) return NextResponse.json({ error: "PROVIDER_NOT_CONFIGURED" }, { status: 501 });
  const base = process.env.PAYPAL_LIVE === "1" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tok = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${cid}:${csec}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  }).then((r) => r.json());
  const cap = await fetch(`${base}/v2/checkout/orders/${parsed.data.orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
  }).then((r) => r.json());
  if (cap.status !== "COMPLETED") throw new ServiceError("PAYPAL_NOT_COMPLETED", cap.status ?? "failed", 402);
  activatePaid(s.uid, "paypal", consumePendingTier(s.uid));
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "billing.activated", meta: { provider: "paypal" } });
  return NextResponse.json({ ok: true });
}
