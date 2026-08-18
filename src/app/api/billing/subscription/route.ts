import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/auth/guard";
import { getSubscription, subscriptionActive, effectivePlan, PRO_PRICE_USD, listPayments } from "@/services/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — own subscription, trial info, invoices. Anon → payload aman (bukan 401). */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) {
    return NextResponse.json({
      subscription: { status: "none", trialEndsAt: null, active: false, provider: null },
      effectivePlan: "free",
      priceUsd: PRO_PRICE_USD,
      payments: [],
    });
  }
  const sub = getSubscription(s.uid);
  return NextResponse.json({
    subscription: { ...sub, active: subscriptionActive(sub) },
    effectivePlan: effectivePlan(s.uid),
    priceUsd: PRO_PRICE_USD,
    payments: listPayments(s.uid),
  });
}
