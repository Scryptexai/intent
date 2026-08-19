import { NextRequest, NextResponse } from "next/server";
import { activatePaid, type PaidTier } from "@/services/billing";
import { appendAudit } from "@/lib/repo";
import { logger } from "@/services/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — PayPal webhook: PAYMENT.CAPTURE.COMPLETED => dana masuk => Pro aktif.
 * Verifikasi signature via verify-webhook-signature bila PAYPAL_WEBHOOK_ID set;
 * tanpa itu (dev) event tetap diproses dengan log warning.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const event = JSON.parse(raw || "{}");
  const whId = process.env.PAYPAL_WEBHOOK_ID;
  if (whId && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    const base = process.env.PAYPAL_LIVE === "1" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const tok = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }).then((r) => r.json());
    const ver = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: "SHA256withRSA",
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: whId,
        webhook_event: event,
      }),
    }).then((r) => r.json());
    if (ver.verification_status !== "SUCCESS") {
      logger.warn("billing", "paypal webhook sig failed");
      return NextResponse.json({ error: "BAD_SIG" }, { status: 400 });
    }
  } else {
    logger.warn("billing", "paypal webhook processed WITHOUT signature verification (dev mode)");
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const custom = String(event.resource?.custom_id ?? "");
    const [uid, tierRaw] = custom.split("|");
    if (uid) {
      const tier: PaidTier = tierRaw === "ultimate" ? "ultimate" : "pro";
      activatePaid(uid, "paypal", tier);
      await appendAudit({ actorId: uid, action: "billing.activated", meta: { provider: "paypal", webhook: true } });
    }
  }
  return NextResponse.json({ received: true });
}
