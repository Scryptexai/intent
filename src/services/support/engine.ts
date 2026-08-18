import { randomBytes } from "node:crypto";
import { KB, FALLBACK, ESCALATION, SUPPORT_PERSONA, type Lang, type SupportContext } from "@/services/support/knowledge";
import { getSubscription, subscriptionActive } from "@/services/billing";
import { briefsToday } from "@/lib/repo";
import { getStore } from "@/lib/store";
import { logger } from "@/services/logger";

/**
 * ── Support engine ──────────────────────────────────────────────────────────
 * Human-feel: intent + sentiment detection, live account grounding, varied
 * openers/closers (seeded per message), empathy lines, one follow-up question.
 * With OPENAI_API_KEY: streamText dengan persona + KB + konteks (lebih luwes);
 * tanpa key: engine lokal ini (tetap kontekstual, bukan template kaku).
 */

export interface SupportMessage {
  role: "user" | "support";
  text: string;
  at: string;
}
export interface SupportThread {
  id: string;
  userId: string | null;
  messages: SupportMessage[];
  meta: { lang: Lang; lastIntent: string | null; pendingTicket: string | null };
  updatedAt: string;
}

export function getThread(userId: string | null): SupportThread {
  const s = getStore();
  let t = s.supportThreads.find((x) => x.userId === (userId ?? "anon"));
  if (!t) {
    t = { id: `th-${randomBytes(4).toString("hex")}`, userId: userId ?? "anon", messages: [], meta: { lang: "id", lastIntent: null, pendingTicket: null }, updatedAt: new Date().toISOString() };
    s.supportThreads.push(t);
  }
  return t;
}

export function detectLang(text: string): Lang {
  const idHits = (text.match(/\b(aku|saya|gak|nggak|banget|dong|ya|yah|kok|bayar|cara|gak\b|mau|kak|bro|terima|terlalu|bilang)\b/gi) ?? []).length;
  return idHits >= 1 ? "id" : "en";
}

function detectSentiment(text: string): "frustrated" | "confused" | "neutral" {
  if (/\b(marah|kecewa|worst|scam|penipuan|bosan|tired|ridiculous|parah|gak jelas|nonsense|refund)\b/i.test(text)) return "frustrated";
  if (/\b(bingung|confused|gak ngerti|don't understand|how|gimana|kenapa|why)\b/i.test(text)) return "confused";
  return "neutral";
}

export async function buildContext(userId: string | null): Promise<SupportContext> {
  const s = getStore();
  if (!userId) {
    return { loggedIn: false, plan: "free", trialDaysLeft: null, pendingPayments: [], briefsUsedToday: 0, watches: 0 };
  }
  const sub = getSubscription(userId);
  const trialDaysLeft =
    sub.status === "trialing" && sub.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000)) : null;
  const user = s.users.find((u) => u.id === userId);
  return {
    loggedIn: true,
    plan: subscriptionActive(sub) ? "pro" : "free",
    trialDaysLeft,
    pendingPayments: s.payments.filter((p) => p.userId === userId && p.status === "pending").map((p) => ({ chain: p.chain ?? "eth", amountUsd: p.amountUsd, status: p.status })),
    briefsUsedToday: await briefsToday(userId),
    watches: s.watchlists.filter((w) => w.userId === userId).length,
    email: user?.email,
  };
}

const OPENERS: Record<Lang, string[]> = {
  id: ["oke,", "siap,", "aku cek dulu ya —", "got it,", "noted,"],
  en: ["got it,", "okay,", "let me take a look —", "sure,", "noted,"],
};
const EMPATHY: Record<Lang, Record<"frustrated" | "confused", string>> = {
  id: {
    frustrated: "paham banget rasanya kalau begini, sorry ya. ",
    confused: "oke, aku bantu urai pelan-pelan. ",
  },
  en: {
    frustrated: "I totally get why that's frustrating, sorry. ",
    confused: "okay, let's untangle it step by step. ",
  },
};
const CLOSERS: Record<Lang, string[]> = {
  id: ["", "", " ada lagi yang mau dicek?", " kabari kalau masih aneh ya.", ""],
  en: ["", "", " anything else you want me to check?", " ping me if it still looks off.", ""],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed >>> 0) % arr.length];
}
function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function detectIntent(text: string): string | null {
  const low = text.toLowerCase();
  if (/\b(escalate|manusia|human agent|tiket|ticket)\b/.test(low)) return "escalate";
  let best: { id: string; score: number } | null = null;
  for (const e of KB) {
    let score = 0;
    for (const k of e.keywords) {
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${esc}\\b`, "i").test(low)) score += k.length > 5 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { id: e.id, score };
  }
  return best && best.score >= 1 ? best.id : null;
}

export async function answerSupport(userId: string | null, message: string): Promise<{ reply: string; intent: string | null; ticket?: string }> {
  const thread = getThread(userId);
  const lang = detectLang(message);
  thread.meta.lang = lang;
  const ctx = await buildContext(userId);
  const seed = seedOf(message);
  const sentiment = detectSentiment(message);
  const intent = detectIntent(message);

  let reply: string;
  let ticket: string | undefined;

  if (intent === "escalate" || (sentiment === "frustrated" && !intent)) {
    ticket = `T-${randomBytes(3).toString("hex").toUpperCase()}`;
    thread.meta.pendingTicket = ticket;
    getStore().tickets.push({ id: ticket, userId: userId ?? "anon", subject: message.slice(0, 120), status: "open", createdAt: new Date().toISOString(), transcript: thread.messages.slice(-8) });
    reply = EMPATHY[lang].frustrated + ESCALATION(lang, ticket);
  } else if (intent) {
    const entry = KB.find((e) => e.id === intent)!;
    const base = entry.answer(ctx, lang);
    const opener = sentiment === "neutral" ? `${pick(OPENERS[lang], seed)} ` : "";
    const empath = sentiment !== "neutral" ? EMPATHY[lang][sentiment] : "";
    const closer = pick(CLOSERS[lang], seed >>> 3);
    reply = empath + opener + base + closer;
  } else {
    reply = FALLBACK(lang);
  }

  thread.meta.lastIntent = intent;
  thread.messages.push({ role: "user", text: message, at: new Date().toISOString() }, { role: "support", text: reply, at: new Date().toISOString() });
  if (thread.messages.length > 60) thread.messages = thread.messages.slice(-60);
  thread.updatedAt = new Date().toISOString();
  logger.info("support", "answered", { intent: intent ?? "fallback", lang, userId: userId ?? "anon" });
  return { reply, intent, ticket };
}

/** System prompt untuk mode OPENAI (persona + KB + konteks live). */
export function aiSystemPrompt(ctx: SupportContext, lang: Lang, history: SupportMessage[]): string {
  const kb = KB.map((e) => `- [${e.id}] ${e.answer(ctx, lang)}`).join("\n");
  return `${SUPPORT_PERSONA.name} · ${SUPPORT_PERSONA.role}. ${SUPPORT_PERSONA.style}
Reply language: ${lang === "id" ? "Bahasa Indonesia casual-professional" : "English casual-professional"}.
LIVE USER CONTEXT (ground your answer in this): ${JSON.stringify(ctx)}
KNOWLEDGE BASE (facts; paraphrase naturally, never copy verbatim, never list like a bot):
${kb}
CONVERSATION SO FAR:
${history.slice(-8).map((m) => `${m.role}: ${m.text}`).join("\n")}
Rules: max 3-5 sentences unless step-by-step is needed; ask at most ONE clarifying question; if payments/KYC, reference the live context above; offer human escalation only when genuinely needed.`;
}
