import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { activatePaid, consumePendingTier, type PaidTier } from "@/services/billing";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — Stripe webhook (checkout.session.completed → activate). */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();
  if (secret) {
    const sig = req.headers.get("stripe-signature") ?? "";
    const [t] = sig.split(",").map((kv) => kv.split("=")[1]);
    const [v1] = sig.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
    if (!t || !v1) return NextResponse.json({ error: "BAD_SIG" }, { status: 400 });
    const calc = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
    if (!timingSafeEqual(Buffer.from(calc), Buffer.from(v1))) return NextResponse.json({ error: "BAD_SIG" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const uid = event.data?.object?.client_reference_id;
    if (uid) {
      const meta = event.data?.object?.metadata?.tier;
      const tier: PaidTier = meta === "ultimate" ? "ultimate" : consumePendingTier(uid);
      activatePaid(uid, "stripe", tier);
      await appendAudit({ actorId: uid, action: "billing.activated", meta: { provider: "stripe" } });
    }
  }
  return NextResponse.json({ received: true });
}
