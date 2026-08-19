/**
 * ── Support Knowledge Base ──────────────────────────────────────────────────
 * Compiled platform facts — sumber kebenaran jawaban support. Slot {…} diisi
 * oleh engine dengan data live user supaya jawaban "mengerti" situasi mereka.
 */

export const SUPPORT_PERSONA = {
  name: "Rara",
  role: "INTENT Support",
  style:
    "Human support specialist: casual-professional, short sentences, empathy first, " +
    "never sounds like a template bot, never says 'as an AI'. Answers in the user's language. " +
    "Uses the user's REAL account context. Admits when unsure and offers human escalation.",
};

export interface KBEntry {
  id: string;
  intents: string[];
  keywords: string[];
  answer: (ctx: SupportContext, lang: Lang) => string;
  followUp?: (ctx: SupportContext, lang: Lang) => string | null;
}

export type Lang = "id" | "en";

export interface SupportContext {
  loggedIn: boolean;
  plan: string;
  trialDaysLeft: number | null;
  pendingPayments: { chain: string; amountUsd: number; status: string }[];
  briefsUsedToday: number;
  watches: number;
  email?: string;
}

const L = (lang: Lang, id: string, en: string) => (lang === "id" ? id : en);

export const KB: KBEntry[] = [
  {
    id: "payment-pending",
    intents: ["payment"],
    keywords: ["payment", "bayar", "pembayaran", "paid", "usdt", "transfer", "saldo", "masuk", "pending", "confirm", "crypto", "solana", "eth"],
    answer: (c, lang) => {
      if (c.pendingPayments.length > 0) {
        const p = c.pendingPayments[0];
        return L(
          lang,
          `aku lihat pembayaran USDT kamu via ${p.chain === "eth" ? "Ethereum L1" : "Solana"} sebesar $${p.amountUsd} masih status pending. watcher kami cek otomatis tiap 5 menit — biasanya konfirmasi < 15 menit setelah tx masuk. kalau lebih dari 30 menit, kirim tx hash-nya ya, aku escalate ke tim finance.`,
          `I can see your USDT payment via ${p.chain === "eth" ? "Ethereum L1" : "Solana"} ($${p.amountUsd}) is still pending. Our watcher checks every 5 minutes — confirmation usually lands < 15 min after the tx. If it's been over 30 min, send me the tx hash and I'll escalate to finance.`,
        );
      }
      return L(
        lang,
        `untuk upgrade kami terima 3 metode: kartu (Stripe), PayPal, atau USDT (Ethereum L1 / Solana). setelah bayar, sistem konfirmasi otomatis — Pro aktif sendiri begitu saldo terdeteksi. kamu mau pakai metode yang mana?`,
        `For upgrades we take 3 methods: card (Stripe), PayPal, or USDT (Ethereum L1 / Solana). Confirmation is automatic — Pro activates itself once the balance is detected. Which method were you going with?`,
      );
    },
  },
  {
    id: "kyc",
    intents: ["kyc"],
    keywords: ["kyc", "verifikasi", "verify", "identity", "sumsub", "identitas", "kartu identitas", "ektp", "paspor"],
    answer: (c, lang) =>
      L(
        lang,
        `kabar baik: kami sudah tidak pakai KYC sama sekali. upgrade sekarang murni terdeteksi dari dana masuk (USDT ETH/Solana atau PayPal) — begitu saldo terkonfirmasi, menu Pro terbuka otomatis.`,
        `good news: we dropped KYC entirely. Upgrades now unlock purely on detected funds (USDT on ETH/Solana or PayPal) — the moment the balance confirms, Pro unlocks automatically.`,
      ),
  },
  {
    id: "trial-pricing",
    intents: ["pricing", "trial"],
    keywords: ["harga", "price", "pricing", "trial", "gratis", "free", "plan", "langganan", "subscribe", "berapa", "bulan"],
    answer: (c, lang) => {
      if (c.trialDaysLeft != null && c.trialDaysLeft > 0)
        return L(
          lang,
          `kamu lagi di trial Pro — sisa ${c.trialDaysLeft} hari, semua fitur kebuka. setelah habis kamu turun ke Free (ranking + 1 brief/hari tetap gratis). upgrade kapan pun $49/bln.`,
          `You're on the Pro trial — ${c.trialDaysLeft} days left, everything unlocked. After that you drop to Free (ranking + 1 brief/day stays free). Upgrade anytime at $49/mo.`,
        );
      return L(
        lang,
        `skema kami: Free selamanya untuk ranking + sitasi penuh + 1 Decision Brief/hari. akun baru dapat trial Pro 1 bulan gratis. Pro $49/bln = brief unlimited, alerts, export, API, Edge. value-nya di waktu riset yang kehemat, bukan sinyal.`,
        `Our setup: Free forever for ranking + full citations + 1 Decision Brief/day. New accounts get a 1-month Pro trial. Pro $49/mo = unlimited briefs, alerts, exports, API, Edge. The value is research time saved, not signals.`,
      );
    },
  },
  {
    id: "login",
    intents: ["login"],
    keywords: ["login", "masuk", "sign in", "google", "password", "akun", "account", "lupa", "forgot", "tidak bisa masuk", "can't log"],
    answer: (c, lang) =>
      L(
        lang,
        c.loggedIn
          ? `kamu sekarang login sebagai ${c.email ?? "akun kamu"}. kalau mau ganti akun: avatar kanan atas → sign out, lalu masuk lagi (email/password atau Google). ada error spesifik yang muncul?`
          : `bisa masuk via Google (paling cepat) atau email+password dari halaman /login. kalau error-nya 'invalid credentials', pastikan email yang dipakai sama dengan saat daftar. error lain? sebutkan pesannya ya biar aku pas-kan solusinya.`,
        c.loggedIn
          ? `You're currently logged in as ${c.email ?? "your account"}. To switch: avatar top-right → sign out, then log in again (email/password or Google). Is a specific error showing up?`
          : `You can sign in with Google (fastest) or email+password from /login. If it says 'invalid credentials', make sure you're using the same email you registered with. Different error? Quote the message and I'll match a fix.`,
      ),
  },
  {
    id: "brief-quota",
    intents: ["quota"],
    keywords: ["brief", "kuota", "quota", "limit", "terkunci", "locked", "402", "upgrade required", "gak bisa buka"],
    answer: (c, lang) =>
      L(
        lang,
        c.plan === "free"
          ? `Free dapat 1 Decision Brief/hari (kamu sudah pakai ${c.briefsUsedToday} hari ini). ranking + sitasi tetap kebuka tanpa batas — itu komitmen kami: trust-depth gratis selamanya. kalau butuh lebih, trial/Pro buka semuanya.`
          : `kuota brief kamu unlimited di plan sekarang — kalau ada brief yang nggak kebuka, itu bug, bukan kuota. coba refresh; kalau masih, kabari slug proyeknya ya.`,
        c.plan === "free"
          ? `Free includes 1 Decision Brief/day (you've used ${c.briefsUsedToday} today). Ranking + citations stay unlimited — that's our commitment: trust-depth is free forever. Need more? trial/Pro unlocks everything.`
          : `Your brief quota is unlimited on your current plan — if a brief won't open, that's a bug, not quota. Try a refresh; if it persists, send me the project slug.`,
      ),
  },
  {
    id: "features-howto",
    intents: ["howto"],
    keywords: ["gimana cara", "how do", "how to", "cara pakai", "fitur", "feature", "brief itu", "radar", "universe", "studio", "truth card", "kalibrasi", "calibration", "mirror", "sentinel"],
    answer: (c, lang) =>
      L(
        lang,
        `jalan tercepat: buka **Morning Brief** (home) — itu radar harian kamu. klik proyek mana pun → **Decision Brief**: verdict + kenapa + bukti satu-klik + 'what would change my mind'. dari brief bisa langsung: IC memo, draft Studio, simulate. bagian mana yang mau aku jelaskan lebih dalam?`,
        `Fastest path: open the **Morning Brief** (home) — that's your daily radar. Click any project → **Decision Brief**: verdict + why + one-click evidence + 'what would change my mind'. From a brief you can jump to: IC memo, Studio draft, simulator. Which part should I walk you through?`,
      ),
  },
  {
    id: "data-honesty",
    intents: ["data"],
    keywords: ["data", "sumber", "source", "akurat", "accurate", "percaya", "trust", "evidence", "sitasi", "citation", "kosong", "empty", "missing"],
    answer: (c, lang) =>
      L(
        lang,
        `pertanyaan bagus dan ini prinsip kami: setiap angka punya sitasi satu-klik (dossier INTENT / on-chain / provider publik) dan label Evidence HIGH/MED/LOW. kalau data tipis, kami tampil kosong + bilang tipis — nggak nebak. track record prediksi kami publik di /track-record, termasuk yang salah.`,
        `Great question, and it's our core principle: every number has a one-click citation (CIF dossier / on-chain / public provider) and an Evidence HIGH/MED/LOW label. When data is thin we show empty and say it's thin — no guessing. Our prediction track record is public at /track-record, including the wrong ones.`,
      ),
  },
  {
    id: "privacy-data",
    intents: ["privacy"],
    keywords: ["privasi", "privacy", "data saya", "my data", "hapus", "delete", "export", "gdpr", "cookie"],
    answer: (c, lang) =>
      L(
        lang,
        `kamu pegang kontrol penuh: di /account ada **Export data (JSON)** dan **Hapus akun & data** (langsung, tanpa email berantai). cookie kami cuma fungsional (sesi + state OAuth), nol tracking. detail di /privacy. mau aku bantu proses salah satunya sekarang?`,
        `You're in full control: /account has **Export data (JSON)** and **Delete account & data** (instant, no email chains). Our cookies are functional-only (session + OAuth state), zero tracking. Details at /privacy. Want me to walk you through either right now?`,
      ),
  },
  {
    id: "greeting",
    intents: ["greeting"],
    keywords: ["halo", "hai", "hi", "hello", "pagi", "siang", "malam", "hey", "bro", "kak"],
    answer: (c, lang) =>
      L(
        lang,
        `halo! aku Rara dari INTENT support 🙂 ada yang bisa aku bantu — billing, upgrade, fitur, atau data?`,
        `hey! Rara here from INTENT support 🙂 what can I help with — billing, upgrade, features, or data?`,
      ),
  },
  {
    id: "are-you-bot",
    intents: ["bot"],
    keywords: ["bot", "robot", "ai", "manusia", "human", "cs", "customer service"],
    answer: (c, lang) =>
      L(
        lang,
        `aku asisten support CIF yang dibekali seluruh knowledge base platform + data akun kamu, jadi jawabannya spesifik ke situasi kamu. kalau kasusmu butuh tangan manusia (refund, dispute), aku buka tiket dan tim kami yang follow up.`,
        `I'm CIF's support assistant, loaded with the platform's full knowledge base plus your account data, so answers are specific to your situation. If your case needs human hands (refunds, disputes), I open a ticket and our team follows up.`,
      ),
  },
];

export const FALLBACK = (lang: Lang) =>
  L(
    lang,
    `oke, biar aku nggak salah tangkap — bisa ceritain sedikit lagi? misalnya: ini soal pembayaran, upgrade, fitur, atau data? atau ketik "escalate" kalau mau langsung aku teruskan ke tim manusia.`,
    `okay, so I don't misread you — could you add a little more? e.g. is this about payments, KYC, features, or data? Or type "escalate" and I'll pass you straight to the human team.`,
  );

export const ESCALATION = (lang: Lang, ticketId: string) =>
  L(
    lang,
    `siap, aku buka tiket **${ticketId}** untuk tim manusia. mereka follow-up via email akun kamu (biasanya < 24 jam jam kerja). semua konteks chat ini aku lampirkan biar kamu nggak perlu jelasin ulang.`,
    `done — I've opened ticket **${ticketId}** for the human team. They'll follow up on your account email (usually < 24h business hours). I've attached this whole chat so you don't have to re-explain.`,
  );
