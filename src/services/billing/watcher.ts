import { getStore } from "@/lib/store";
import { confirmPayment, tryAutoVerifyEth } from "@/services/billing";
import { pushNotification } from "@/lib/repo";
import { logger } from "@/services/logger";

/**
 * ── Payment watcher (auto-trigger saat saldo masuk) ─────────────────────────
 * Setup sekarang, trigger real kemudian:
 *  - ETH L1: auto-verify via Etherscan bila ETHERSCAN_API_KEY ada.
 *  - Solana: adapter `verifySolTransfer` siap di-wire (Helius/Solana RPC + SPL
 *    parsing) — saat ini null (manual/admin) hingga provider diaktifkan.
 *  - Demo trigger: env PAYMENT_AUTOCONFIRM_MINUTES=N mengonfirmasi payment
 *    pending berusia > N menit (simulasi "saldo masuk") supaya alur trigger
 *    teruji end-to-end tanpa provider.
 * Dipanggil oleh scheduler (interval 5m) dan cron `/api/billing/watcher`.
 */

export async function verifySolTransfer(_payment: { payTo: string | null; amountUsd: number; paymentRef: string | null }): Promise<string | null> {
  // TODO(real trigger): Helius/Solana RPC — cari transfer SPL USDT ke payTo
  // dengan amount cocok sejak payment.createdAt; return txHash bila ketemu.
  return null;
}

export async function watchPendingPayments(): Promise<{ checked: number; confirmed: number }> {
  const s = getStore();
  const pending = s.payments.filter((p) => p.status === "pending" && p.provider === "crypto");
  let confirmed = 0;
  const autoOn = process.env.PAYMENT_AUTOCONFIRM_MINUTES != null;
  const autoMin = Math.max(0, Number(process.env.PAYMENT_AUTOCONFIRM_MINUTES ?? 0));

  for (const pay of pending) {
    let tx: string | null = null;
    if (pay.chain === "eth") tx = (await tryAutoVerifyEth(pay.id))?.txHash ?? null;
    else if (pay.chain === "solana") tx = await verifySolTransfer(pay);

    if (!tx && autoOn) {
      const ageMin = (Date.now() - new Date(pay.createdAt).getTime()) / 60000;
      if (ageMin >= autoMin) tx = `dev-autoconfirm-${pay.paymentRef}`;
    }

    if (tx) {
      confirmPayment(pay.id, tx);
      pushNotification({
        userId: pay.userId,
        kind: "pattern_match",
        title: "Pembayaran terdeteksi — Pro aktif",
        body: `USDT ${pay.chain} masuk (${tx.slice(0, 18)}…). Subscription diaktivasi otomatis.`,
        link: "/account",
      });
      logger.info("billing", "watcher confirmed payment", { payment: pay.id, tx: tx.slice(0, 20) });
      confirmed++;
    }
  }
  return { checked: pending.length, confirmed };
}
