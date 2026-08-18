import { describe, expect, it } from "vitest";
import { answerSupport, detectIntent, detectLang } from "@/services/support/engine";
import { createCryptoPayment } from "@/services/billing";

describe("support engine (human-feel, grounded)", () => {
  it("detects language & intents", () => {
    expect(detectLang("aku gak bisa bayar nih")).toBe("id");
    expect(detectLang("my payment is pending")).toBe("en");
    expect(detectIntent("pembayaranku pending terus")).toBe("payment-pending");
    expect(detectIntent("why is KYC required?")).toBe("kyc");
    expect(detectIntent("escalate me to a human")).toBe("escalate");
  });

  it("grounds payment answers in LIVE pending payment", async () => {
    createCryptoPayment("u-analyst", "solana");
    const r = await answerSupport("u-analyst", "kak, pembayaran usdt ku kok belum masuk?");
    expect(r.reply).toContain("Solana");
    expect(r.reply).toContain("$49");
  });

  it("grounds trial answers with real days left", async () => {
    const r = await answerSupport("u-analyst", "how long is my trial?");
    expect(r.reply).toMatch(/\d+ (days|hari)/);
  });

  it("frustrated user gets empathy + ticket (escalation)", async () => {
    const r = await answerSupport("u-viewer", "this is ridiculous, refund me now");
    expect(r.ticket).toBeTruthy();
    expect(r.reply).toMatch(/T-[A-F0-9]{6}/);
  });

  it("fallback asks clarifying question, not a dead end", async () => {
    const r = await answerSupport(null, "xyzzy blorp");
    expect(r.reply.length).toBeGreaterThan(40);
    expect(r.intent).toBeNull();
  });
});
