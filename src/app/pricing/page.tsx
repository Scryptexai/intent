import type { Metadata } from "next";
import { UpgradeClient } from "@/components/shell/upgrade-client";

export const metadata: Metadata = {
  title: "Pricing · INTENT",
  description:
    "Free forever for trust-depth. Pro meters scope & continuity. 1-month free trial for new accounts. Payments: Stripe, PayPal, USDT (ETH & Solana).",
};

/** /pricing = alias penuh untuk experience upgrade di /upgrade. */
export default function PricingPage() {
  return <UpgradeClient />;
}
