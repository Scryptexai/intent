# PRODUCTION-READINESS — gap analysis (fitur · UI/UX · security · engineering)

> Audit berbasis kondisi riil kode per commit terakhir. Format: **B** = blocker
> go-live, **E** = enterprise, **C** = consumer/polish. Prioritas P0→P2 di §6.

## 0. TL;DR

Produk secara *data & reasoning* sudah unik dan aman di level dependensi
(0 critical/high, hardening terdokumentasi). Yang memisahkan dari production:
**(1) state & scheduler tidak bertahan di serverless**, **(2) tidak ada
authN/authZ**, **(3) tidak ada CI/observability**. Sisanya adalah kedalaman
fitur trust-UI (blueprint §3) dan permukaan enterprise.

## 1. Blocker go-live (production correctness)

| # | Gap | Dampak | Arah solusi |
|---|---|---|---|
| B1 | **Store in-memory per-proses** (`globalThis`) | Di Vercel serverless: draft/watchlist/sim/ack **hilang saat cold-start** dan **tidak konsisten antar-instance**; dua request bisa melihat data berbeda | Tulis ke Postgres (Neon via Drizzle — schema sudah ada) atau Supabase per-user tables; store jadi cache-read-through, bukan source of truth |
| B2 | **Scheduler `setInterval` tidak jalan di serverless** | Sentinel 6h & truth-refresh 24h mati di produksi | Vercel Cron → `POST /api/sentinel/run` (+ endpoint refresh matrix) atau worker BullMQ terpisah |
| B3 | **Tidak ada authN/authZ** | Semua write endpoint (`drafts`, `watchlist`, `share`, `multiverse POST`, `simulations POST`, `plan POST`) terbuka; multi-user = IDOR | Auth.js/Supabase Auth; RLS per-user; RBAC minimal (user/admin); upgrade-dialog → checkout nyata (Stripe) |
| B4 | ~~Tidak ada CI/CD~~ **DONE (2026-08-17)**: template `ci/ci-workflow.template.yml` (salin ke `.github/workflows/ci.yml` — sandbox tidak punya permission `workflows`) — typecheck + vitest + build + audit (critical gate, high informational) | — | Sisa: branch protection main + preview per PR di setting GitHub |
| B5 | **Tidak ada observability** | Bug produksi buta | Sentry (error) + log terstruktur ke sink (Axiom/Datadog) + health endpoint `/api/health` (store, supabase reachability, scheduler last-run) |

## 2. Fitur — consumer → enterprise

### 2.1 Consumer (closing loop blueprint)
- **Trust UI §3 penuh**: panel sitasi satu-klik per claim (data `evidenceText` sudah ada, UI belum expandable), badge Evidence Level HIGH/MED/LOW per fakta, halaman **Track Record publik** (3 backtest sudah ada di `benchmarks`) + **calibration store** untuk live calls (tabel baru `calibration_calls`).
- **Search global**: **DONE (2026-08-17)** — typeahead lintas katalog (proyek/pattern/decision/entity/narrative/knowledge) dengan deep-link bermakna (project→/brief, decision→/multiverse, entity/knowledge→dossier, pattern→brief analog) + palette grouping ber-ikon & i18n.
- **Notifikasi**: email/webhook untuk Sentinel alert & watchlist trigger (aturan alert sudah ada di `watchlists.alert_triggers`).
- **Studio kolaboratif**: komentar/approval draft, penjadwalan post, **OAuth X/LinkedIn nyata** (UI placeholder ada), analitik share (klik/impresi per Truth Card via token).
- **Export**: due-diligence memo PDF, CSV untuk tabel POV/entities, batch Truth Cards.
- **i18n** ID/EN (copy kini campur) + format angka/tanggal locale + penanda timezone "as-of".
- Permukaan §2b lain: N-way analog comparison, founder/team lookup lintas proyek, red-flag scanner, portfolio ber-grade.

### 2.2 Enterprise
- **RBAC + org/teams + SSO/SAML**, audit log aktivitas (siapa membaca dossier mana — nilai jual compliance).
- **API produk**: versioned (`/v1`), API keys, rate limit per key (Upstash), dokumentasi OpenAPI; webhook katalog baru.
- **Tenant isolation** row-level bila multi-org; opsi CMK/encryption-at-rest untuk kontrak besar.
- **DPA/ToS/Privacy + cookie consent**; data inventory PII (draft = konten user → right-to-delete).
- **White-label** (brand kit Truth Cards & warna) — dekat dengan token brand yang sudah ada.

### 2.3 Data upstream (lane [data], berdampak ke produk)
- `relationships` = 0 baris → graph/contagion surface kosong; **CIF Score 1/27**; field sintesis `cif_projects` (pattern_confidence/trajectory/current_read/signal/observable/comparables) null; skala 27→~1000. UI wajib tetap empty-state jujur sampai terisi.

## 3. UI/UX

| Area | Kondisi | Kerja |
|---|---|---|
| Resilience | **0 error boundary**, `loading.tsx`/`not-found.tsx` default, toast ad-hoc | `error.tsx` per-segment + global ErrorBoundary; desain 404/500 bermerek; toast system (sonner) + undo (acknowledge) |
| A11y | **1 aria-label** di seluruh komponen; tanpa skip-link; focus ring parsial; reduced-motion belum | Audit: label semua icon-button, `aria-live` untuk toast/stream, skip-to-content, `prefers-reduced-motion`, uji kontras amber-on-dark, keyboard untuk Flow/tabel |
| Responsive | Desktop-first (sesuai blueprint) tapi beberapa grid sempit di <md | Mobile companion: layout ringkas per modul (bukan replika) |
| Data-dense UI | Tanpa virtualisasi/sort/pagination (entities 1.154 dibatasi 60) | TanStack Virtual + sort + column picker + CSV |
| Charts | Statik; tanpa zoom/brush/compare/PNG export | ECharts toolbox + dataZoom; overlay compare proyek |
| State UX | Filter/selection tidak deep-link (kecuali beberapa `?projectId`) | Semua filter ke URL (shareable state), pin/recent projects |
| Perf | First-load ±480 kB (ECharts+xyflow+md-editor) | Route-level `dynamic()` untuk berat; Suspense streaming above-the-fold; cache OG PNG per hash param |
| SEO | **DONE (2026-08-17)**: robots+sitemap ada; `generateMetadata` per halaman /brief & /project dengan OG = Truth Card dinamis; sitemap memuat /brief hero | Polish: OG per modul tools |

## 4. Security (melengkapi `SECURITY.md`)

1. **authZ/IDOR** (B3) + isolasi data per-user; uji IDOR otomatis di CI (test harness multi-user).
2. **CSRF**: saat sesi cookie masuk, tambah CSRF token/Double-Submit untuk write routes (Next tidak otomatis).
3. **Rate limiting** per IP+user di edge (Upstash Ratelimit) — kuota generasi kini hanya per-user in-memory.
4. **WAF/bot**: Vercel/Cloudflare turnstile untuk endpoint mahal (`generate-content`, `simulate`).
5. **CSP bertahap + `frame-ancestors` domain sendiri** setelah preview iframe tak diperlukan.
6. **Secrets hygiene**: rotasi publishable key terdokumentasi; hapus default embed bila auth produksi live (env-only).
7. **Supply chain**: Dependabot/Renovate + gate audit CI + SBOM untuk procurement enterprise; provenance npm.
8. **SAST/DAST**: eslint-plugin-security + semgrep di CI; scan tahunan pihak ketiga (pen test) sebelum kontrak enterprise.
9. **PII/GDPR**: consent banner, DPA, retensi & penghapusan draft; klasifikasi data (semua data publik-riset + konten user).
10. **AI safety/ops**: batas token/biaya per tier, cache respons per (template,tone,source,version), guard prompt-injection untuk jalur "paste own research" (fallback), label AI-generated pada output share.
11. **DR/backup**: PITR Neon/Supabase + runbook restore; definisi RPO/RTO; uji restore semesteran.
12. **Audit log** enterprise (akses dossier, export, login) — immutable append-only.

## 5. Engineering/ops

- **Envs**: preview/staging/prod; feature flags sederhana (env-based) untuk permukaan §2b.
- **Caching strategy**: CDN/ISR untuk halaman katalog & `/api/cif` (immutable antar-sync, `revalidate` = frekuensi sync); `stale-while-revalidate` header; ETag untuk dossier.
- **Load test** (k6) untuk `simulate` & `scan`; pindahkan komputasi berat ke queue bila perlu.
- **Vercel Cron config** (`vercel.json`) untuk B2; idempotency key di run endpoint.
- **Runbook**: deploy, rollback, incident, rotate key, restore DB (link dari `DEPLOYMENT.md`).

## 6. Prioritas eksekusi

| Fase | Isi | Exit criteria |
|---|---|---|
| **P0 go-live** | B1–B5: write-path DB, Vercel Cron, Auth+RLS, CI gates, Sentry+health; error boundaries; rate limit | Deploy produksi bertahan restart, multi-user aman, CI hijau wajib |
| **P1 trust & loop** | Trust UI §3 (sitasi, badge, Track Record+calibration), search global, notif, OAuth X nyata, SEO pack, a11y pass | Blueprint §3 "ship together" terpenuhi |
| **P2 enterprise** | RBAC/SSO, audit log, API v1+keys+docs, export/PDF, i18n, virtualisasi, DPA/consent, pen test | Pilot 1 fund/riset team |

## 7. Kekuatan yang sudah enterprise-grade (jangan dirusak)

Skema locked + lineage per-fakta; arsitektur trust dirancang sejak awal; 0 crit/high deps + hardening terdokumentasi; 31 test; dokumentasi lengkap (CONTEXT/CODE/ROADMAP/DEPLOYMENT/SECURITY) — fondasi langka untuk usia proyek ini.
