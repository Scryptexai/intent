# SECURITY — posture, audit, dan hardening

> Postur: **security #1, produk #2**. File ini hidup — update setiap audit/upgrade.
> Audit terakhir: 2026-08-12 (sesi `arena/019febd8-intent`), tools: `npm audit` + review manual.

## 1. Hasil audit & perbaikan (commit "security audit")

| Temuan | Severity | Mitigasi |
|---|---|---|
| Next.js 14.2.15: ±25 advisories (DoS RSC, cache poisoning, SSRF Server Actions/rewrites, middleware bypass, XSS image opt.) | **CRITICAL/HIGH** | Upgrade ke **Next 15.5.23** (semua patched di 15.5.x) + migrasi async `params`/`searchParams`, React 19, `@xyflow/react` v12 |
| sharp <0.35 (libvips CVE-2026-33327/8, CVE-2026-35590/1) via Next | HIGH | `overrides: sharp ^0.35.3` |
| undici ≤6.27 (smuggling, CRLF, DoS WebSocket, cookie injection) via `@ai-sdk/provider-utils` | HIGH | `overrides: undici ^6.28.0` |
| nanoid ≤3.3.16 | HIGH | `overrides: nanoid ^3.3.18` |
| postcss ≤8.5.22 | HIGH | dev deps + override `^8.5.26` |
| drizzle-orm <0.45.2 (SQL injection via identifier escaping) | HIGH | Upgrade `0.45.2` + drizzle-kit `0.31.10` |
| echarts <6.1.0 (XSS) | MODERATE | Upgrade `6.1.0` |
| ai SDK <5.0.52 (filetype whitelist bypass upload) | MODERATE | Upgrade `ai@5.0.233` + `@ai-sdk/openai@2` |

**Status akhir: 0 critical · 0 high.** Sisa 4 moderate + 4 low, seluruhnya
**dev-only tooling** (`esbuild`/`@esbuild-kit` via drizzle-kit, low di ai-sdk) — tidak
dikirim ke produksi; diterima sementara, revisit saat upstream rilis fix.

## 2. Hardening aplikasi

- **Input validation**: zod di semua POST user-facing + batas panjang (`drafts` 20k
  char, id ≤64, `shareUrl` harus URL); `simulator` **clamp** nilai ke rentang
  variabel (9999 → max); `addBranch` tolak judul <3/>200 char & clamp probabilitas.
- **Header injection**: nilai header custom disanitasi latin-1 (`headerTitle`).
- **Security headers** (`next.config.mjs`): `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`.
- **XSS**: React escaping default; markdown via `@uiw/react-md-editor` (sanitized);
  Truth Card = satori (text-only PNG, tanpa script).
- **SSRF**: tidak ada outbound fetch berbasis input user (Supabase URL konstan).
- **Secrets**: tidak ada secret di git. `sb_publishable_*` di `defaults.ts` adalah
  kunci anon **publik-by-design** (RLS SELECT-only); service_role/OAuth/DB keys
  hanya via env deployment. `.env*` di-gitignore.
- **Rate/abuse**: free tier 3 generasi/hari (`usage_events`); payload dibatasi zod.
- **Bridge Supabase**: read-only; write hanya sync script upstream (service_role).

## 3. Enterprise hardening (ditambahkan sesi "enterprise model")

- **AuthN**: login scrypt + session cookie HMAC (HttpOnly/Lax/Secure), 7 hari.
- **RBAC** viewer/analyst/admin dipaksa di middleware + route (lihat `docs/API.md`).
- **CSRF**: middleware menolak mutation ber-Origin lintas host.
- **Rate limit** 60/menit/IP per path mutation (per-instance; upgrade Upstash untuk edge-global).
- **API keys** sha256-stored, scope read, untuk `/api/v1`.
- **Cron auth** Bearer `CRON_SECRET` (Vercel Cron) untuk run/refresh.
- **Audit trail** append-only (`audit_logs`), UI `/admin` (role admin).
- **IDOR**: ownership dipaksa di repo layer (`updateDraft` dll. memfilter userId).
- **Headers**: + HSTS, + CSP **Report-Only** (measure dulu, jangan break preview).
- **Persistensi**: repo layer Drizzle untuk data user-scoped bila `DATABASE_URL`
  ada (serverless-safe); fallback memory untuk demo.

## 3a. Keputusan sadar (tidak dilakukan + alasan)


- **Tanpa CSP ketat**: preview live di-embed iframe platform + ECharts/md-editor
  butuh inline style/script. Bila kelak deploy standalone: tambah CSP bertahap.
- **Tanpa X-Frame-Options/DENY**: memecahkan live preview (iframe). Ganti nanti ke
  `frame-ancestors` berisi domain sendiri bila preview tak lagi dibutuhkan.
- **Tanpa authN/authZ asli**: demo single-user in-memory. **WAJIB** sebelum produksi
  dengan DB nyata: semua endpoint write (`drafts`, `watchlist`, `share`,
  `multiverse POST`, `simulations POST`) saat ini tanpa autentikasi.
- **Next 16** belum diambil: 15.5.23 bersih dari known high/critical; upgrade major
  berikutnya adalah keputusan produk (lihat ROADMAP).

## 4. Audit lapis-2 (deep syntax / RCE / injection) — 2026-08-12

Sink-scan seluruh `src/` (grep manual, hasil pada commit audit):

| Kelas sink | Hasil |
|---|---|
| `eval` / `new Function` / `vm.` / `child_process` / `exec*` / `spawn` | **0** — tidak ada jalur eksekusi kode |
| `dangerouslySetInnerHTML` / `innerHTML` / `document.write` | **0** — XSS via DOM injection tidak mungkin dari kode kita |
| `new RegExp(input)` (ReDoS dari input user) | **0** — semua regex literal & sederhana |
| SSRF: fetch dengan URL variabel | semua fetch client **same-origin** (`/api/…`) + `encodeURIComponent`; server tidak pernah fetch URL dari input user (Supabase URL konstan) |
| Path traversal: `readFile/path.join` | hanya `DIR` konstan + nama file konstan (`cif-loader`); params tidak pernah masuk path |
| Open redirect (`location.assign/href=`, `window.open`) | **0** |
| Deserialisasi: `JSON.parse` body | selalu via `req.json().catch` + validasi zod sebelum dipakai |
| Prototype pollution | `Object.assign(row, patch)` hanya dengan key yang diizinkan zod |
| Markdown | `@uiw/react-md-editor` default `preview="edit"`; preview tersanitasi; konten = milik user sendiri (self-XSS only, demo) |
| ECharts tooltip | formatter hanya menyentuh data server-side / read-only RLS (write butuh service_role) |

Bug integritas yang ditemukan & diperbaiki pada audit ini:
1. **Route GET tanpa arg `request` ter-prerender static** di App Router → data build-time
   membeku (`/api/plan` kuota, `/api/drafts`, `/api/watchlist`, `/api/sentinel`,
   `/api/projects`, `/api/edge/variables`). Fix: `export const dynamic = "force-dynamic"`
   di semuanya. (Kuota free-tier bisa tampak stale di client sebelum fix ini.)
2. Tiga fetch client memakai param URL mentah di path (`/api/cif/${slug}`,
   `/api/actors/${id}`) → kini `encodeURIComponent`. Server tetap hanya lookup
   string (tanpa path/fs) sehingga dampaknya terbatas, tapi defense-in-depth.
3. `POST /api/share` kini membatasi `content` ≤20k & `draftId` ≤64.
4. Link bukti di Origin kini `target=_blank rel="noreferrer noopener"`.

## 5. Checklist sesi berikutnya

1. `npm audit` → 0 high/critical sebelum merge fitur baru; override hanya untuk
   transitif dev atau bila upstream belum rilis, selalu dicatat di §1.
2. Endpoint baru: zod + batas panjang + ServiceError berstatus; jangan pernah
   interpolasi input user ke SQL/path/header mentah.
3. Dependency baru: cek advisories + lisensi; hindari package dengan postinstall
   mencurigakan; kunci range major.
4. Ubah header/CSP: uji dulu live preview (iframe) sebelum menambah restriksi frame.
5. Setelah auth produksi ada: turunkan item §3 "tanpa authZ" dari daftar accepted.
