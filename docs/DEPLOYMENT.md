# DEPLOYMENT — Vercel + domain real + verifikasi Supabase

> **Mengapa wajib deploy untuk test koneksi Supabase:** sandbox development
> memblokir TLS ke `supabase.co` (egress whitelist). Query live dirancang berjalan
> di **browser** (NEXT_PUBLIC), jadi bukti koneksi hanya terlihat dari deployment
> produksi dengan domain real.

## 1. Deploy ke Vercel

1. Merge branch sesi ke `main` (PR sudah disiapkan dari branch `arena/...`).
2. Vercel → *Add New Project* → import repo `Scryptexai/intent`.
3. Preset otomatis **Next.js** — build `npm run build`, output `.next`. Tidak ada
   yang perlu diubah.
4. Environment variables — salin dari `.env.example` (sumber kebenaran tunggal).
   Ringkasan kebutuhan:

   | Var | Tag | Kebutuhan | Catatan |
   |---|---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | NEXT_PUBLIC | **wajib prod** | domain real; dipakai metadataBase, sitemap, robots, return URL billing |
   | `NEXT_PUBLIC_SUPABASE_URL` | NEXT_PUBLIC | opsional | default embed = project CIF live |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | NEXT_PUBLIC | opsional | default embed (publishable/anon, RLS read-only) |
   | `SUPABASE_SERVICE_ROLE_KEY` | SERVER-ONLY | opsional | bridge server `/api/data/catalog`; jangan beri prefix NEXT_PUBLIC_ |
   | `SESSION_SECRET` | SERVER-ONLY | **wajib prod** | tanda tangan cookie sesi |
   | `CRON_SECRET` | SERVER-ONLY | disarankan | bearer cron watcher/sentinel/narratives |
   | `OPENAI_API_KEY` | SERVER-ONLY | disarankan | mengaktifkan streamText real di Content Studio |
   | `CIF_MODEL` | SERVER-ONLY | opsional | default `gpt-4o-mini` |
   | `SUPPORT_AI_BASE_URL` / `SUPPORT_AI_API_KEY` / `SUPPORT_AI_MODEL` | SERVER-ONLY | opsional | AI support "Rara" (base default sudah di kode) |
   | `DATABASE_URL` | SERVER-ONLY | opsional | Neon Postgres via Drizzle (tanpa ini: in-memory store) |
   | `REDIS_URL` | SERVER-ONLY | opsional | scheduler (tanpa ini: interval in-process) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | SERVER-ONLY | opsional | Sign in with Google (docs/GOOGLE-OAUTH.md) |
   | `X_CLIENT_ID` / `X_CLIENT_SECRET` | SERVER-ONLY | opsional | Direct Post OAuth ke X |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | SERVER-ONLY | disarankan | checkout kartu tier Pro/Ultimate |
   | `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_LIVE` | SERVER-ONLY | disarankan | orders + capture; `PAYPAL_WEBHOOK_ID` opsional untuk verifikasi signature |
   | `USDT_ETH_TREASURY` / `USDT_SOL_TREASURY` | SERVER-ONLY | disarankan | alamat invoice USDT (ERC-20 & SPL) |
   | `ETHERSCAN_API_KEY` | SERVER-ONLY | opsional | auto-verifikasi transfer ETH on-chain |
   | `WEBHOOK_URL` / `WEBHOOK_SECRET` | SERVER-ONLY | opsional | notifikasi keluar |

   Catatan: **tidak ada env KYC** — upgrade terbuka murni via deteksi dana
   masuk (watcher on-chain / capture webhook / Stripe session).

5. Deploy. Catat URL `*.vercel.app`.

## 2. Domain real

1. Vercel project → *Settings → Domains* → tambah domain Anda (mis. `cif.domainanda.com`).
2. Ikuti CNAME/A record yang Vercel berikan di DNS provider; HTTPS otomatis.
3. **Supabase tidak membatasi origin** untuk query REST anon, jadi tidak ada
   konfigurasi tambahan di Supabase untuk membaca data. (Bila suatu saat memakai
   Supabase Auth: tambahkan URL redirect domain di *Auth → URL Configuration*.)

## 3. Checklist verifikasi pasca-deploy

- [ ] `https://<domain>/` render; chip di bawah judul The Sentinel berbunyi:
      `LIVE Supabase bridge: 27 cif_projects · 6 patterns · 3 backtests · 944+ entities · 795 evidence items`
      (angka mengikuti isi tabel live).
- [ ] `https://<domain>/api/cif` → `supabase: { configured: true, reachable: true }`.
- [ ] `/origin` → entity explorer badge **LIVE Supabase**; cari "capital" → Sequoia Capital.
- [ ] `/mirror?projectId=p-layerzero` → kartu *Registry patterns (locked P-codes)*
      menampilkan source LIVE (P4, P7–P16 untuk LayerZero).
- [ ] `/project/layerzero` → dossier: 15 Decision Events, 76 entities, conflicts, QA.
- [ ] `/studio` → generate thread (streaming), Truth Card PNG terunduh.
- [ ] Bila `OPENAI_API_KEY` diisi: header response `x-cif-source: openai`.

## 4. Bila chip tetap "snapshot" di produksi

Artinya query browser gagal. Dua penyebab umum:

1. **RLS SELECT tidak mencakup role anon** (open question Blueprint §10.4 upstream).
   Periksa di Supabase Dashboard → *Authentication → Policies* per tabel, lalu:

   ```sql
   -- jalankan untuk kelima tabel bila policy anon belum ada
   create policy "cif_public_read" on public.cif_projects
     for select to anon, authenticated using (true);
   create policy "cif_public_read" on public.cif_patterns
     for select to anon, authenticated using (true);
   create policy "cif_public_read" on public.cif_backtests
     for select to anon, authenticated using (true);
   create policy "cif_public_read_entities" on public.entities
     for select to anon, authenticated using (true);
   create policy "cif_public_read_evidence" on public.evidence_items
     for select to anon, authenticated using (true);
   ```

   (Nama policy harus unik per tabel; sesuaikan bila sudah ada policy serupa.
   Write tetap hanya via service_role sync script upstream — jangan tambah policy write.)

2. Nama tabel berbeda dari ekspektasi → cek tab *Table Editor*; bila upstream
   mengganti nama, update `src/hooks/use-cif-live.ts` + `lib/supabase/rows.ts`.

## 5. Rollback / keamanan

- Publishable key boleh tersebar (memang untuk browser); bila di-rotate upstream,
  update `src/lib/supabase/defaults.ts` atau set env `NEXT_PUBLIC_*` (env menang).
- Jangan pernah commit `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, key
  service_role, atau secret OAuth ke repo.
