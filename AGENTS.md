# AGENTS.md — aturan main untuk sesi/developer baru

> Baca file ini DULU sebelum menyentuh kode. Repo ini = **INTENT**, aplikasi
> consumer ("CIF · Forensic Intelligence") yang mengkonsumsi data locked dari
> repo knowledge **Scryptexai/crypto-intelligence-framework** (upstream).

## 1. Identitas & arah

- INTENT adalah *strategic co-pilot* untuk user crypto advanced: Sentinel (anomaly),
  Mirror (analog), Origin (kredibilitas), Multiverse (causal chains), Edge (simulator),
  Content Studio (AI → konten viral), Project Detail (dossier).
- **Blueprint produk upstream masih CAIR; SKEMA DATA locked (`cif-export/1`).**
  Jadi: app menyesuaikan ke bentuk data, jangan pernah memutilasi/mengasumsikan
  bentuk data sendiri. Baca `docs/CONTEXT.md`.
- Knowledge asli TIDAK boleh di-hardcode ulang di app — ambil dari snapshot
  `src/data/cif/*.json` (vendored) dan/atau Supabase live (lihat §4).

## 2. Branch & push

- Setiap sesi Arena terikat ke branch `arena/<session-id>`-nya sendiri.
  **Hanya push ke branch sesi itu** (`git push origin arena/...`), buka PR ke `main`.
- Snapshot environment me-rebase history antar-sesi → push biasa sering
  *non-fast-forward*: `git fetch origin <branch> -f` lalu `git push --force`
  (aman: branch sesi berisi history milik sesi itu sendiri).
- Setelah merge ke `main`, sesi baru harus branch dari `main` dan membaca file ini.

## 3. Run & test

```bash
npm install          # node_modules TIDAK bertahan antar-sesi — selalu install dulu
npm run dev | npm run start -p 3000
npm run typecheck    # wajib hijau sebelum commit
npm test             # vitest (27 tests: services + cif-loader)
npm run build        # build production
```

- Sandbox **tidak bisa** TLS ke `supabase.co` maupun `fonts.googleapis.com`
  (egress whitelist). Jangan mencoba fetch Supabase dari server sandbox untuk
  verifikasi — bukti koneksi dilihat dari bundle/deploy (lihat `docs/DEPLOYMENT.md`).
- Fonts sudah self-hosted (`src/fonts/`, via `next/font/local`) — JANGAN pakai
  Google Fonts CDN lagi.
- `.env.local` TIDAK bertahan antar-sesi (gitignored). Kredensial yang memang
  publik-by-design (Supabase publishable key) sudah di-embed di
  `src/lib/supabase/defaults.ts`; rahasia sungguhan (OPENAI_API_KEY, DATABASE_URL,
  REDIS_URL, X OAuth) hanya via env deployment.

## 4. Data: tiga sumber, satu prioritas tampilan

1. **Supabase live** (browser-side, `src/hooks/use-cif-live.ts`): tabel
   `cif_projects`, `cif_patterns`, `cif_backtests`, `entities`, `evidence_items`
   (RLS read-only). UI otomatis menampilkan "LIVE Supabase" bila query sukses.
2. **Snapshot vendored** `src/data/cif/*.json` (cif-export/1) via
   `src/services/cif-loader.ts` — fallback bila bridge gagal.
3. **Demo universe sintetis** (500 proyek) via `src/lib/data/seed.ts` — mengisi
   modul yang butuh telemetry (Sentinel/Edge/Mirror heuristik).

Open item terbesar: **policy RLS SELECT untuk role `anon`** mungkin belum ada
(Blueprint §10.4 upstream) → bila UI tetap snapshot di deploy produksi,
tambahkan policy SELECT anon di 5 tabel itu lewat Supabase dashboard/SQL.

## 5. Konvensi kode

- Backend logic hidup di `src/services/*` (logger + `ServiceError{code,status}`),
  dikonsumsi API routes (`src/app/api/*`) dan server pages.
- Frontend fetch via **TanStack Query** (skeleton wajib), state global via
  **zustand** (`src/stores/*`), brand token di `tailwind.config.ts`.
- Tambah tabel → `src/lib/db/schema.ts` + `npm run db:generate` (Drizzle/Neon
  opsional; runtime demo tetap in-memory store).
- Setiap fitur baru: sertakan test vitest bila logic, dan update `docs/ROADMAP.md`
  bila mengubah status item.

## 6. Peta dokumen

| Doc | Isi |
|---|---|
| `docs/CONTEXT.md` | tujuan platform, positioning, trust rules, relasi ke upstream |
| `docs/CODE-STRUCTURE.md` | peta kode + "ubah apa di mana" |
| `docs/ROADMAP.md` | status, prioritas next-session, open questions |
| `docs/DEPLOYMENT.md` | runbook Vercel + domain real + checklist test Supabase |
| `docs/PRODUCTION-READINESS.md` | apa yang kurang menuju production/enterprise + prioritas P0-P2 |
| `docs/API.md` | kontrak authN/RBAC/keys/cron; demo creds & demo API key |
| `docs/GOOGLE-OAUTH.md` | registrasi Google OAuth consent (scopes, redirect URI, checklist approval) |
| `docs/SECURITY.md` | posture, hasil audit, hardening, residual risk, checklist |
| `docs/MARKETING.md` | marketing kit: konteks produk, diferensiator, value tier, messaging do/don't, playbook |
