# BRAND — INTENT (paket v1.0, implementasi frontend)

Ringkasan eksekusi brand package di repo ini (lihat juga `assets/brand/`):

| Aset | File |
|---|---|
| Icon only (The Signal) | `assets/brand/logo-intent-icon.svg` · `icon-512.png` · `src/app/icon.png` (favicon otomatis) · `src/app/apple-icon.png` · `public/favicon.png` |
| Primary horizontal | `assets/brand/logo-intent-primary.svg/.png` |
| Stacked + tagline | `assets/brand/logo-intent-stacked.svg/.png` · `public/og-image.png` (OG) |
| Splash / loading | `assets/brand/splash.svg` · `public/splash.png` (arsip brand); loading live = logo animasi full-code di `src/app/loading.tsx` |
| Regenerate raster | `node scripts/rasterize-brand.mjs` (sharp) |

## Tokens (tailwind `intent.*`)
bg #0B0E11 · surface #161B22 · hover #1C2128 · gold #F59E0B (primary/CTA/score) ·
goldDark #D97706 · teal #2DD4BF (evidence/verification/interaktif) · tealDark #059669 ·
text #FFFFFF · muted #8B949E · lime #A3E635 (positif) · rose #FB7185 (negatif).
Gradients: gold→goldDark (tombol), teal→tealDark (verification).

## Typography
Inter (400/500/700, sentence case) + JetBrains Mono untuk data/angka (tabular-nums);
label UI uppercase letter-spacing. Font self-hosted (`src/fonts/`, variabel).

## Komponen
Primary button = gold bg + teks obsidian, hover goldDark · Secondary/outline =
border gold + teks gold · Card 12px radius, border white/6, shadow 0 1px 3px ·
Sidebar active = bg gold/15 + border-left 3px gold + teks putih · Dark default.

## Penempatan logo
Header/sidebar kiri-atas: icon + INTENT + tagline · favicon icon-only ·
OG = stacked · splash saat loading · Truth Card footer "POWERED BY INTENT".
