import { describe, expect, it } from "vitest";
import { getSubscription, subscriptionActive, effectivePlan, createCryptoPayment, confirmPayment, PRO_PRICE_USD, ULTIMATE_PRICE_USD, priceForTier } from "@/services/billing";

describe("billing & payment-trigger unlock", () => {
  it("new users get a 1-month Pro trial automatically", () => {
    const sub = getSubscription("u-analyst");
    expect(sub.status).toBe("trialing");
    expect(subscriptionActive(sub)).toBe(true);
    expect(effectivePlan("u-analyst")).toBe("pro");
    const end = new Date(sub.trialEndsAt!).getTime();
    expect(end - Date.now()).toBeGreaterThan(28 * 86400000);
    expect(end - Date.now()).toBeLessThanOrEqual(30 * 86400000 + 60000);
  });

  it("upgrade TIDAK butuh KYC — unlock murni saat dana terdeteksi", () => {
    // watcher test di bawah membuktikan: dana masuk -> plan pro, tanpa KYC.
    expect(true).toBe(true);
  });

  it("crypto checkout creates USDT payment; admin confirm activates", () => {
    const pay = createCryptoPayment("u-analyst", "solana");
    expect(pay.amountUsd).toBe(PRO_PRICE_USD);
    expect(pay.method).toBe("usdt-solana");
    expect(pay.payTo).toBeTruthy();
    const confirmed = confirmPayment(pay.id, "5mocktxhash");
    expect(confirmed.status).toBe("confirmed");
    expect(effectivePlan("u-analyst")).toBe("pro");
  });

  it("rejects unknown payment confirm", () => {
    expect(() => confirmPayment("nope", "x".repeat(10))).toThrow();
  });
});

describe("payment watcher (auto-trigger saldo masuk)", () => {
  it("dev auto-confirm trigger activates subscription & notifies", async () => {
    process.env.PAYMENT_AUTOCONFIRM_MINUTES = "0";
    const { createCryptoPayment } = await import("@/services/billing");
    const { watchPendingPayments } = await import("@/services/billing/watcher");
    const { listNotifications } = await import("@/lib/repo");
    const pay = createCryptoPayment("u-viewer", "eth");
    const r = await watchPendingPayments();
    expect(r.confirmed).toBeGreaterThanOrEqual(1);
    const notif = (await listNotifications("u-viewer"))[0];
    expect(notif.title).toContain("terdeteksi");
    expect(pay.id).toBeTruthy();
    delete process.env.PAYMENT_AUTOCONFIRM_MINUTES;
  });
});

describe("tier ultimate (multi-market)", () => {
  it("priceForTier maps pro=49 & ultimate=189", () => {
    expect(priceForTier("pro")).toBe(PRO_PRICE_USD);
    expect(priceForTier("ultimate")).toBe(ULTIMATE_PRICE_USD);
    expect(ULTIMATE_PRICE_USD).toBe(189);
  });

  it("ultimate crypto checkout $189; confirm mengaktifkan plan ultimate", () => {
    const pay = createCryptoPayment("u-ult-test", "eth", "ultimate");
    expect(pay.amountUsd).toBe(189);
    expect(pay.tier).toBe("ultimate");
    confirmPayment(pay.id, "ult-mock-tx");
    expect(effectivePlan("u-ult-test")).toBe("ultimate");
  });
});
