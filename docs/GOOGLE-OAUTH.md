# GOOGLE OAUTH — implementasi + runbook approval consent screen

## Yang sudah di-build (kode)

- **Sign in with Google** OAuth 2.0 + PKCE, scope **terbatas & non-sensitive**:
  `openid email profile` (tanpa Gmail/Drive/Contacts → jalur verifikasi ringan).
- `GET /api/auth/google` → redirect `accounts.google.com/o/oauth2/v2/auth`
  (state + S256 challenge, cookie `g_pkce` HttpOnly 10 menit).
- `GET /api/auth/google/callback` → exchange `oauth2.googleapis.com/token`,
  userinfo `openidconnect.googleapis.com/v1/userinfo`, provision user
  (role `viewer`, plan `free`, passwordHash null), sign session HMAC 7 hari,
  audit `login.google`. Semua kegagalan → `/login?error=…` yang ramah.
- Tombol "Continue with Google" di `/login` + link **Privacy/Terms/About**
  (halaman publik `/privacy`, `/terms`, `/about`) — **dipersyaratkan Google**.

## Runbook registrasi di Google Cloud Console

1. **Project**: buat/pilih project (nama produk: "CIF Forensic Intelligence").
2. **OAuth consent screen** (`APIs & Services → OAuth consent screen`):
   - User type: **External** (atau Internal bila hanya tim).
   - App name: `CIF Forensic Intelligence`; Support email & developer contact: email domain Anda.
   - **Authorized domain**: domain produksi Anda (mis. `cif.domainanda.com`) — wajib HTTPS.
   - Logo & branding sesuai kebijakan Google (tanpa klaim menyesatkan).
3. **Scopes**: tambahkan hanya:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   (jangan scope sensitif → menghindari verifikasi security-assessment berat).
4. **Credentials** (`Credentials → Create → OAuth client ID`, type **Web application**):
   - **Authorized JavaScript origins**: `https://cif.domainanda.com` (+ `https://*.vercel.app` untuk preview bila perlu).
   - **Authorized redirect URIs**: `https://cif.domainanda.com/api/auth/google/callback`
     (+ varian vercel.app untuk staging).
   - Salin `Client ID`/`Client secret` → env Vercel `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. **Test users** (selama status "Testing"): tambahkan email penguji; login Google
   hanya berhasil untuk mereka sampai app dipublish.
6. **Publish** (`Publish App`): untuk scope non-sensitive, approval umumnya otomatis
   setelah data halaman konsent lengkap (privacy policy URL **wajib** terisi:
   `https://cif.domainanda.com/privacy`).
7. **Branding requirements**: halaman Privacy & Terms memuat kalimat kepatuhan
   terhadap *Google API Services User Data Policy* termasuk *limited use* — sudah
   tertuang di `/privacy` §2.

## Checklist approval (self-check sebelum submit)

- [ ] Privacy policy live & reachable tanpa login, menyebut data Google + limited use.
- [ ] Terms live; tombol Google menautkan keduanya (sudah di `/login`).
- [ ] Redirect URI persis sama dengan console (trailing slash sensitif).
- [ ] Scope minimal; tidak membaca/menulis data Google lain; token tidak disimpan
      (session-only access token untuk provisioning user — kami **tidak menyimpan
      refresh token**).
- [ ] Logo/branding tidak meniru Google; nama app konsisten.
- [ ] Halaman error OAuth ramah (`/login?error=…`).

## Catatan sandbox vs produksi

Sandbox dev tidak dapat menjangkau endpoint Google (egress whitelist) — alur
gagal lembut ke `/login?error=google_unreachable`. Di Vercel + domain real
dengan env terisi, alur langsung berfungsi tanpa perubahan kode.
