# API — auth, RBAC, keys, cron (enterprise model)

## AuthN
- `POST /api/auth/login {email,password}` → session cookie `cif_session`
  (HMAC-SHA256, HttpOnly, SameSite=Lax, Secure di production, 7 hari).
- `POST /api/auth/logout`, `GET /api/auth/me`.
- Password: scrypt (format `scrypt:<salt>:<hex>`), compare timing-safe.
- Demo accounts (docs-only, ganti di produksi): `admin@cif.local`,
  `analyst@cif.local`, `viewer@cif.local` — password `cif-enterprise-2026`.

## RBAC (dipaksa di route + middleware)
| Aksi | viewer | analyst | admin |
|---|---|---|---|
| Semua GET publik/katalog | ✅ | ✅ | ✅ |
| GET drafts/watchlist/sims/audit-self | ✅ (own) | ✅ (own) | ✅ |
| Write: drafts, watch, share, branch, sim, ack, generate | ❌ 403 | ✅ | ✅ |
| `POST /api/sentinel/run`, `/api/narratives/refresh` | ❌ | ✅ (demo) | ✅ |
| `/api/admin/*` | ❌ | ❌ | ✅ |
| `/api/v1/*` | API key scope `read` | | |

Middleware juga menolak mutation tanpa session (401) dan Origin lintas-host
(CSRF, 403), plus rate-limit 60 req/menit/IP per path mutation.

## API keys (programmatic)
- Header `x-cif-key: <raw>`; disimpan sebagai sha256 di `api_keys` (scope `read`).
- Demo key: `cif_demo_key_2026` (scope read) — hanya untuk sandbox.
- Endpoint: `GET /api/v1/projects?limit=` (audit-logged).

## Cron (Vercel)
`vercel.json`: `/api/sentinel/run` tiap 6 jam; `/api/narratives/refresh` harian 03:00.
Set `CRON_SECRET`; Vercel mengirim `Authorization: Bearer <CRON_SECRET>`.
Tanpa secret (demo), sesi analyst/admin diterima.

## Catatan produksi
- Ganti SESSION_SECRET & CRON_SECRET via env Vercel.
- Upgrade rate-limit ke Upstash (edge-global) bila multi-instance ketat diperlukan.
- Audit trail: `GET /api/admin/audit` (admin), append-only.
