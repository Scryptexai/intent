import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized, appendAudit } from "@/lib/repo-auth";
import { PRO_PRICE_USD, priceForTier, createCryptoPayment, setPendingTier, type PaidTier } from "@/services/billing";
import { ServiceError, logger } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  method: z.enum(["stripe", "paypal", "crypto"]),
  chain: z.enum(["eth", "solana"]).optional(),
  tier: z.enum(["pro", "ultimate"]).optional(),
});

/**
 * POST /api/billing/checkout — paid upgrade (tanpa KYC; unlock murni deteksi dana masuk).
 * stripe → Checkout Session URL · paypal → order id · crypto → payTo/ref/amount.
 */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { method, chain } = parsed.data;
  const tier: PaidTier = parsed.data.tier ?? "pro";
  const priceUsd = priceForTier(tier);
  const tierLabel = tier === "ultimate" ? "INTENT Ultimate" : "INTENT Pro";
  setPendingTier(s.uid, tier);
  const origin = req.nextUrl.origin;

  try {
    if (method === "crypto") {
      const pay = createCryptoPayment(s.uid, chain ?? "eth", tier);
      await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "billing.checkout", meta: { method, chain, tier } });
      return NextResponse.json({ payment: pay });
    }

    if (method === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new ServiceError("PROVIDER_NOT_CONFIGURED", "Set STRIPE_SECRET_KEY.", 501);
      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set("success_url", `${origin}/upgrade?paid=1`);
      params.set("cancel_url", `${origin}/upgrade`);
      params.set("client_reference_id", s.uid);
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][unit_amount]", String(priceUsd * 100));
      params.set("line_items[0][price_data][recurring][interval]", "month");
      params.set("line_items[0][price_data][product_data][name]", tierLabel);
      params.set("metadata[tier]", tier);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new ServiceError("STRIPE_ERROR", d?.error?.message ?? "stripe failed", 502);
      await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "billing.checkout", meta: { method, tier } });
      return NextResponse.json({ url: d.url, sessionId: d.id });
    }

    // paypal
    const cid = process.env.PAYPAL_CLIENT_ID;
    const csec = process.env.PAYPAL_CLIENT_SECRET;
    if (!cid || !csec) throw new ServiceError("PROVIDER_NOT_CONFIGURED", "Set PAYPAL_CLIENT_ID/SECRET.", 501);
    const base = process.env.PAYPAL_LIVE === "1" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const tok = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${cid}:${csec}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }).then((r) => r.json());
    const order = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: String(PRO_PRICE_USD.toFixed(2)) }, description: "INTENT Pro monthly" }],
        application_context: { return_url: `${origin}/upgrade?paid=1`, cancel_url: `${origin}/upgrade` },
        custom_id: `${s.uid}|${tier}`,
      }),
    }).then((r) => r.json());
    if (!order.id) throw new ServiceError("PAYPAL_ERROR", "order failed", 502);
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "billing.checkout", meta: { method } });
    return NextResponse.json({ orderId: order.id, approveUrl: (order.links ?? []).find((l: { rel: string }) => l.rel === "approve")?.href });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    logger.error("billing", "checkout failed", { error: String(e) });
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
