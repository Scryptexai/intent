import { createHash, randomBytes } from "node:crypto";
import { getStore } from "@/lib/store";
import { logger, ServiceError } from "@/services/logger";
import type { Plan } from "@/lib/domain";

/**
 * ── Billing & subscriptions ─────────────────────────────────────────────────
 * Plans: free · pro. New users get a 1-month Pro trial automatically.
 * Providers: stripe (card) · paypal · crypto (USDT on Ethereum L1 / Solana).
 * Upgrades unlock purely on payment detection (crypto watcher / PayPal webhook).
 */

export const PRO_PRICE_USD = 49;
export const ULTIMATE_PRICE_USD = 189;
export type PaidTier = "pro" | "ultimate";
export function priceForTier(tier: PaidTier): number {
  return tier === "ultimate" ? ULTIMATE_PRICE_USD : PRO_PRICE_USD;
}

/** Tier checkout terakhir per user — dipakai webhook/capture saat aktivasi. */
const pendingTier = new Map<string, PaidTier>();
export function setPendingTier(userId: string, tier: PaidTier) { pendingTier.set(userId, tier); }
export function consumePendingTier(userId: string): PaidTier {
  const t = pendingTier.get(userId) ?? "pro";
  pendingTier.delete(userId);
  return t;
}
export const FREE_BRIEFS_PER_DAY = 1;
export const TRIAL_DAYS = 30;

export interface SubscriptionRow {
  id: string;
  userId: string;
  plan: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  provider: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export function getSubscription(userId: string): SubscriptionRow {
  const s = getStore();
  let sub = s.subscriptions.find((x) => x.userId === userId);
  if (!sub) {
    sub = {
      id: `sub-${randomBytes(6).toString("hex")}`,
      userId,
      plan: "pro",
      status: "trialing",
      provider: null,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
      currentPeriodEnd: null,
      createdAt: new Date().toISOString(),
    };
    s.subscriptions.push(sub);
    logger.info("billing", "trial started (1 month free)", { userId });
  }
  return sub;
}

export function subscriptionActive(sub: SubscriptionRow): boolean {
  if (sub.status === "active") return true;
  if (sub.status === "trialing" && sub.trialEndsAt) return new Date(sub.trialEndsAt).getTime() > Date.now();
  return false;
}

/** Effective plan used for gating (trial counts as pro; paid tier dihormati). */
export function effectivePlan(userId: string): Plan {
  const sub = getSubscription(userId);
  if (!subscriptionActive(sub)) return "free";
  return sub.plan === "ultimate" ? "ultimate" : "pro";
}

export function activatePaid(userId: string, provider: string, tier: PaidTier = "pro"): SubscriptionRow {
  const s = getStore();
  const sub = getSubscription(userId);
  sub.status = "active";
  sub.provider = provider;
  sub.plan = tier;
  sub.currentPeriodEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  const u = s.users.find((x) => x.id === userId);
  if (u) u.plan = tier;
  logger.info("billing", "subscription activated", { userId, provider, tier });
  return sub;
}

export interface PaymentRow {
  id: string;
  userId: string;
  provider: string;
  method: string;
  amountUsd: number;
  status: "pending" | "confirmed" | "failed";
  payTo: string | null;
  paymentRef: string | null;
  txHash: string | null;
  chain: string | null;
  tier: PaidTier;
  createdAt: string;
}

export const USDT_ETH = process.env.USDT_ETH_TREASURY ?? "0x000000000000000000000000000000000000dEaD";
export const USDT_SOL = process.env.USDT_SOL_TREASURY ?? "So11111111111111111111111111111111111111112";

export function createCryptoPayment(userId: string, chain: "eth" | "solana", tier: PaidTier = "pro"): PaymentRow {
  const row: PaymentRow = {
    id: `pay-${randomBytes(8).toString("hex")}`,
    userId,
    provider: "crypto",
    method: chain === "eth" ? "usdt-eth" : "usdt-solana",
    amountUsd: priceForTier(tier),
    status: "pending",
    payTo: chain === "eth" ? USDT_ETH : USDT_SOL,
    paymentRef: randomBytes(8).toString("hex"),
    txHash: null,
    chain,
    tier,
    createdAt: new Date().toISOString(),
  };
  getStore().payments.unshift(row);
  logger.info("billing", "crypto checkout created", { userId, chain, ref: row.paymentRef });
  return row;
}

export function listPayments(userId: string): PaymentRow[] {
  return getStore().payments.filter((p) => p.userId === userId);
}

export function confirmPayment(paymentId: string, txHash: string): PaymentRow {
  const s = getStore();
  const pay = s.payments.find((p) => p.id === paymentId);
  if (!pay) throw new ServiceError("PAYMENT_NOT_FOUND", "no such payment", 404);
  pay.status = "confirmed";
  pay.txHash = txHash;
  activatePaid(pay.userId, "crypto", pay.tier ?? "pro");
  logger.info("billing", "crypto payment confirmed", { paymentId, txHash });
  return pay;
}

/** Optional auto-verification for USDT-ETH via Etherscan (key-gated). */
export async function tryAutoVerifyEth(paymentId: string): Promise<PaymentRow | null> {
  const key = process.env.ETHERSCAN_API_KEY;
  const pay = getStore().payments.find((p) => p.id === paymentId);
  if (!key || !pay || pay.chain !== "eth") return null;
  try {
    const usdt = "0xdac17f958d2ee523a2206206994597c13d831ec7";
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdt}&address=${pay.payTo}&page=1&offset=10&sort=desc&apikey=${key}`;
    const res = await fetch(url);
    const d = await res.json();
    const hit = (d.result ?? []).find(
      (tx: { value: string; hash: string; timeStamp: string }) =>
        Number(tx.value) / 1e6 >= pay.amountUsd - 0.01 && Date.now() / 1000 - Number(tx.timeStamp) < 86400,
    );
    if (hit) return confirmPayment(paymentId, hit.hash);
  } catch (e) {
    logger.warn("billing", "eth auto-verify failed", { error: String(e) });
  }
  return null;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
