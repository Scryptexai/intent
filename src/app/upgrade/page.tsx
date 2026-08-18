import type { Metadata } from "next";
import { UpgradeClient } from "@/components/shell/upgrade-client";

export const metadata: Metadata = {
  title: "Upgrade ke Pro · INTENT",
  description:
    "INTENT Pro — akses lebih luas ke intelijen forensik tingkat lanjut: Decision Brief tanpa batas, alert real-time, simulator counter-factual, export memo, dan API. $49/bulan dengan uji coba 30 hari untuk akun baru. Pembayaran via Stripe, PayPal, atau USDT (ETH & Solana).",
  openGraph: { title: "INTENT Pro — Make decisions you can defend.", images: ["/media/og-intent.png"] },
};

export default function UpgradePage() {
  return <UpgradeClient />;
}
