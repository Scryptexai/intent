# ROADMAP — status & prioritas developer

> Update file ini setiap mengubah status item. Terakhir: sesi `arena/019febd8-intent`.

## ✅ Selesai & terverifikasi (commit terakhir di branch sesi)

- 6 modul + Project Detail (7 tab) — semua dinamis via TanStack Query, skeleton, zustand.
- Services layer + 27 vitest tests hijau; typecheck & build production hijau.
- Drizzle schema + migrasi 0000/0001 (Neon opsional); scheduler 6h/24h (BullMQ/interval).
- Integrasi **skema locked cif-export/1**: snapshot vendored + loader + dossier UI
  (Decision Events 8-POV + Hidden factors, conflicts A/B, QA 6 dimensi, knowledge
  bersitasi evidenceText, entity graph, registry P-codes + scope/confidence).
- **Supabase bridge**: client publishable key (embed defaults), hook live browser-side,
  UI live-aware (Sentinel chip / Origin explorer / Mirror registry), probe server
  ber-cache + fallback snapshot.
- Content Studio: streaming (OpenAI bila key ada, else composer 3 tone), md-editor,
  Save/Copy/Direct Post (placeholder OAuth)/Truth Card (next/og), kuota Free badge.
- Gating Free/Pro sesuai posisi blueprint (2 demo proyek, 3 gen/hari; Pro = 500+ & Edge).

## 🎧 Customer Support — sesi "next" (human-feel, full platform knowledge)

- Widget chat floating (semua halaman) + `/api/support` (GET thread, POST answer).
- Persona "Rara · CIF Support": casual-professional, empathy-first, bervariasi
  (openers/closers seeded), kadang dua bubble, typing delay ritme manusia,
  deteksi bahasa ID/EN, deteksi sentimen, follow-up question, TANPA bahasa bot.
- **Grounding ke data live user**: payment pending (chain+amount), sisa trial,
  status KYC, kuota brief, email — jawaban "mengerti" situasi nyata (test hijau).
- Intent KB 10 area (payment/KYC/pricing/login/quota/fitur/data/privacy/greeting/
  bot-question) + fallback klarifikasi + eskalasi tiket (T-XXXXXX) → admin panel.
- Mode AI penuh: provider OpenAI-compatible di **https://api.hcnsec.cn/**
  (`SUPPORT_AI_BASE_URL/MODEL/API_KEY` override) → streamText persona + KB +
  konteks live; gagal → fallback engine lokal (support tak pernah diam).
- Footer widget jujur: "AI-assisted, backed by full platform knowledge".

## 💳 Billing & KYC — status sesi "next" (payment live-ready)

- **Trial**: akun baru otomatis Pro trial 30 hari (`billing.getSubscription`);
  gating memakai `effectivePlan` (trial = pro).
- **Stripe** Checkout Session (fetch API, webhook signed `checkout.session.completed`),
  **PayPal** orders+capture (sandbox/live), **Crypto USDT** ERC-20 (ETH L1) & SPL
  (Solana): payTo treasury + ref + amount, verify on-chain (Etherscan optional)
  atau confirm admin; aktivasi subscription otomatis.
- ~~KYC Sumsub wajib sebelum upgrade berbayar~~ → **DIHAPUS atas keputusan
  owner**: upgrade kini terbuka murni via deteksi dana masuk (watcher on-chain
  / PayPal capture / Stripe session), tanpa verifikasi identitas.
- UI: `/upgrade` full-screen production-grade (hero, feature cards, tabel
  Free vs Pro, sticky checkout 3 metode + chain selector, crypto invoice panel
  + copy address + auto-poll, success/manage state, FAQ); `/pricing` = alias.
  `/account` billing section (status, provider, invoices).
- Middleware: provider webhooks (stripe/sumsub) di-exempt dari session gate.
- Env lengkap di `.env.example`; 45 tests hijau (billing+KYC gate+crypto+watcher).
- **Payment auto-trigger**: watcher 5m (interval + Vercel cron) — ETH auto via
  Etherscan bila key ada, Solana adapter siap wire, dev trigger
  PAYMENT_AUTOCONFIRM_MINUTES; panel crypto polling 20s + notifikasi aktivasi.
- Home densitas: stats strip, Today's Pick, unlock radar, pattern heat,
  funding tape; rename tools "Sentinel Ops" (beda dari Morning Brief).

## 🏗️ P2 slice — status sesi "next"

- **i18n EN/ID** progresif (shell + header modul, toggle topbar, persist localStorage).
- **Consent banner** cookie fungsional (client-only, pilihan persist).
- **GDPR self-service**: `/account` + `/api/account/export` (portabilitas JSON) +
  `/api/account/delete` (right-to-erasure, purge rows, audit).
- **Webhook adapter** notifikasi (`WEBHOOK_URL` + `WEBHOOK_SECRET`, fire-and-forget).
- **API v1 diperluas**: `/api/v1/patterns` + `/api/v1/projects/[slug]` dossier;
  spesifikasi **`openapi.yaml`** di root.
- **Perf**: ReactFlow code-split (`FlowCanvas`, client-only) + load-more di
  entity explorer & audit; skrip k6 `perf/load-test.js`.
Sisa P2: SSO/SAML + org/multi-tenant, i18n konten penuh, virtualisasi penuh,
DPA terpisah, pen-test pihak ketiga.

## 🤝 P1 "Trust & Loop" — status sesi "next phase"

Selesai (terverifikasi curl + 39 tests):
- **§3.1 Citation panel** satu-klik (Evidence Level + provenance + passage +
  link dossier GitHub) di knowledge dossier; `CitationPanel` reusable.
- **§3.2 Pattern badges** instances + confidence + scope + warning weakly-
  transferable (single-instance) di Mirror registry cards.
- **§3.3/9.3 Calibration**: publish Current Read (PC/TP berlabel benar, trigger
  objektif, resolution window) + grading publik pass/fail/inconclusive + score;
  UI `/track-record` + API + seed 2 calls.
- **Global search** `/api/search` (projects/patterns/entities/narratives/DE)
  terpasang di cmdk (debounced).
- **Notification loop**: Sentinel scan → fan-out ke watchlist → bell topbar
  (unread count, mark-read, poll 60s).
- **X OAuth 2.0 PKCE** path nyata (`/api/x/auth`, `/api/x/callback`, share pakai
  token bila terhubung; fallback simulated di sandbox).
- **Export memo** `/print/[slug]` (print→PDF, light theme, break-inside-avoid).

Sisa P1→P2: adapter email/webhook untuk notifikasi, aktivasi kredensial X,
i18n, virtualisasi tabel, SSO/org, DPA/consent, pen-test.

## 🏭 Enterprise model — status sesi "fix all upgrade to enterprise"

Blocker P0 **selesai di level kode** (verifikasi curl terdokumentasi):
- **B1 persistensi**: `src/lib/repo.ts` — Drizzle write-path (drafts/watchlist/sims/
  usage/audit) bila `DATABASE_URL` ada; memory fallback demo. Ownership dipaksa
  (uji IDOR hijau).
- **B2 scheduler**: `vercel.json` cron 6h/24h + `CRON_SECRET` bearer (`cronAuthorized`).
- **B3 authN/authZ**: login scrypt + session HMAC (middleware edge), RBAC
  viewer/analyst/admin, CSRF origin-check, rate-limit 60/mnt, API keys `/api/v1`,
  audit trail + `/admin`, halaman `/login`, `/track-record`.
- **B4 CI**: template `ci/ci.yml.template` siap pakai — token sesi tidak punya
  permission `workflows`, jadi saat merge maintainer menyalinnya ke
  `.github/workflows/ci.yml` (typecheck, test, audit-gate, build).
- **B5 observability**: `/api/health` + `error.tsx`/`not-found.tsx`/`loading.tsx`
  bermerek; hook sink error siap Sentry.
Plus: SEO (robots/sitemap/metadata), HSTS + CSP Report-Only, evidence badges
(§3.2), skip-link & aria, 36 tests hijau.
**Sisa P1/P2** (trust UI sitasi penuh, notif, OAuth X nyata, SSO/org, i18n,
virtualisasi) → lihat PRODUCTION-READINESS §2/§6.

## 🏭 Production/enterprise gap analysis

Lihat **`docs/PRODUCTION-READINESS.md`** (single source of truth untuk gap:
blocker go-live B1-B5, fitur consumer/enterprise, UI/UX, security lanjutan,
prioritas P0-P2). Ringkasan blocker: write-path DB (state in-memory tidak
bertahan di serverless), Vercel Cron pengganti setInterval, authN/authZ+RLS,
CI gates, observability.

## 🔥 Next session (urutan prioritas)

1. **Deploy Vercel + domain real** → verifikasi LIVE Supabase dari browser produksi
   (runbook: `DEPLOYMENT.md`). Ini satu-satunya cara membuktikan bridge karena
   sandbox memblokir egress ke supabase.co.
2. **RLS anon SELECT**: cek di Supabase dashboard; bila query live gagal karena
   policy, tambahkan `SELECT` untuk `anon` pada `cif_projects`, `cif_patterns`,
   `cif_backtests`, `entities`, `evidence_items` (SQL contoh di DEPLOYMENT.md).
3. **OPENAI_API_KEY** di Vercel agar generate-content memakai model real
   (tanpa key pun berfungsi via composer deterministik).
4. **X OAuth Direct Post**: isi `X_CLIENT_ID/SECRET`, implementasi token exchange +
   `POST /2/tweets` di `api/share` (UI sudah siap).
5. Render field sintesis `cif_projects` bila upstream mengisi: `pattern_confidence`,
   `trajectory_probability`, `current_read`, `signal`, `observable`, `comparables`
   (hari ini null — UI wajib skip bila null, jangan isi placeholder).

## 🧭 Menengah (permukaan §2b blueprint — data sudah mendukung)

- Red-flag scanner (baca field extracted yang sudah ada).
- Due-diligence memo export (kompilasi dossier → dokumen exportable).
- Historical-analog comparison N-way (Mirror sudah 1-way; perlu tabel compare).
- Founder/team track-record lookup lintas proyek (butuh `relationships` terisi —
  gap upstream; empty-state jujur sampai data ada).
- Portfolio with graded outcomes (ikat posisi user ke history Current Read).
- Track Record publik + **calibration store** (timestamped calls + resolusi) —
  gap bernilai tertinggi menurut EnterpriseRoadmap upstream; butuh kontrak data
  baru (tabel `calibration_calls`) + grading publik.
- Today's Pick (satu laporan penuh harian, gratis, system-assigned).

## 🚫 Guardrails (jangan dilanggar tanpa revisi upstream)

- Jangan forecast CIF Score; jangan tampilkan sebagai kesehatan proyek.
- Jangan gate trust-depth di paywall (sitasi/evidens tampil di semua tier).
- Forward-looking = Current Read (dua angka berlabel terpisah) + signal ber-trigger
  objektif; tidak ada prediksi biner sukses/gagal.
- Studio: tidak generate dari paste user sebagai jalur utama; citation trail wajib.
- Skema data locked: app mengikuti bentuk ekspor upstream, bukan sebaliknya.

## 🔐 Security (audit 2026-08-12 — detail `SECURITY.md`)

- Upgrade besar: Next 14.2.15 → **15.5.23** (+React 19, `@xyflow/react` v12, ai v5,
  drizzle-orm 0.45, echarts 6, zod 3.25) → menutup 1 critical + seluruh high.
- Overrides: sharp 0.35.3, undici 6.28, nanoid 3.3.18, postcss 8.5.26 → **0 high tersisa**.
- Hardening: zod+caps di semua POST, clamp simulator, cap addBranch, shareUrl URL-only,
  sanitasi header latin-1, security headers response.
- Accepted residual: moderate/low dev-only (esbuild/drizzle-kit); tanpa CSP/frame-blok
  (preview iframe); **authZ produksi WAJIB sebelum DB nyata** (semua write endpoint
  saat ini unauthenticated by design demo).

## 🐛 Known issues / catatan lingkungan

- Sandbox: egress whitelist (supabase.co & fonts.googleapis diblok) → verifikasi live
  hanya mungkin dari deploy/browser user; fonts sudah self-host.
- `.env.local` & `node_modules` tidak bertahan antar-sesi Arena → `npm install` dulu;
  rahasia via env deployment; publishable key aman di-embed (publik by design).
- Push antar-sesi sering non-fast-forward (snapshot rebase) → fetch -f + force push
  ke branch sesi sendiri.
