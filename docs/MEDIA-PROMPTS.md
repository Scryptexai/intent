# MEDIA-PROMPTS — spesifikasi ukuran + prompt generasi media INTENT

> Kontrak antara **design web** dan **generasi media**. Prinsip: *tentukan dulu
> requirement ukuran setiap slot di website, baru tulis prompt* — generator AI
> (GPT image / Midjourney / Gemini) hanya native di 1:1 / 16:9 / 9:16, slot web
> punya rasio sendiri. Strategi crop yang disetujui:
>
> - **STRATEGI A (band tengah):** generate 16:9, semua elemen (logo, visual,
>   teks) di band horizontal tengah; atas/bawah background polos → di-crop via
>   CSS `object-fit: cover`.
> - **STRATEGI B (center-box):** 1:1, subjek di safe-box tengah 60%.
>
> Media brand di `public/media/`; render in-flow `object-cover` (tidak
> menghalangi konten), kecuali modal entry (dismissible, 1×/sesi).

---

## 1. Aturan bahasa & elemen brand

- **Teks di dalam gambar = selalu ENGLISH** (brand creative global), apa pun
  locale UI. Headline per slot terdaftar di §3; tagline selalu
  *"Know the Intent. See the Signal."*
- **Copy UI (tombol, body, modal) mengikuti locale aktif** via i18n
  (`src/lib/i18n`) — English full / Indonesia full, tidak dicampur.
- Setiap brand banner WAJIB memuat 3 elemen: **(1) logo** diamond gold
  broken-bar + wordmark "INTENT"; **(2) visual konteks** — robot analis
  forensik geometric (visor gold/teal) memeriksa data; **(3) headline +
  tagline** dieja EXACTLY di prompt.
- **STYLE BLOCK (tempel ke semua prompt):**
  > Dark forensic-intelligence terminal aesthetic. Deep obsidian `#0B0E11`,
  > slate `#161B22`, hairline grid 5% white, glowing truth-gold `#F59E0B`,
  > electric-teal `#2DD4BF`, cinematic, ultra clean, premium. No watermark.
- Aksen: gold = Pro, teal = Ultimate/verification.

## 2. Slot & ukuran (sumber kebenaran)

| id | Slot | Tampil | Rasio | Generate | Strategi | File |
|---|---|---|---|---|---|---|
| `modal-promo` | Banner modal entry | 560×176 | 3.2:1 | 16:9 | A band 45% | `media/modal-promo.png` |
| `banner-pro` | Carousel home slide 1 + cross-sell | 1100×220 / 1100×110 | 5:1 & 10:1 | 16:9 | A band 30% | `media/banner-pro.png` |
| `banner-ultimate` | Carousel slide + cross-sell Ultimate | s.d. | 5:1 & 10:1 | 16:9 | A band 30% | `media/banner-ultimate.png` |
| `banner-trust` | Carousel slide trust | 1100×220 | 5:1 | 16:9 | A band 30% | `media/banner-trust.png` |
| `page-universe` | Header banner /universe | 1100×~176 | 4:1 | 16:9 | A band 30% | `media/page-universe.png` |
| `page-mirror` | Header banner /mirror | s.d. | 4:1 | 16:9 | A band 30% | `media/page-mirror.png` |
| `page-origin` | Header banner /origin | s.d. | 4:1 | 16:9 | A band 30% | `media/page-origin.png` |
| `page-multiverse` | Header banner /multiverse | s.d. | 4:1 | 16:9 | A band 30% | `media/page-multiverse.png` |
| `page-edge` | Header banner /edge | s.d. | 4:1 | 16:9 | A band 30% | `media/page-edge.png` |
| `page-studio` | Header banner /studio | s.d. | 4:1 | 16:9 | A band 30% | `media/page-studio.png` |

Implementasi: `src/components/shell/promo-surfaces.tsx` — `PromoModal`
(aspect-[3.2/1]), `HomeHeroCarousel` (aspect-[5/1], auto-rotate 6s, dots +
arrows, pause on hover; slides adaptif per tier), `CrossSellBanner`
(h-[110px]), `PageBanner` (aspect-[4/1], min-h 96 / max-h 180). CTA HTML
hanya tombol di atas scrim tipis — tidak menutup teks banner.

**Loading:** bukan foto — logo animasi full-code (SVG stroke-draw diamond +
orbit sweep teal) di `src/app/loading.tsx` + keyframes `globals.css`.

## 3. Prompt siap pakai (aset yang tayang)

Semua prompt diawali STYLE BLOCK + "16:9 (1600×900), elements inside the
MIDDLE band; top/bottom plain #0B0E11 for crop" sesuai strategi §2.

- **modal-promo** — LOGO + TEXT EXACTLY headline "Read the Intent. Not the
  Noise." + tagline gold; VISUAL robot bust slate visor gold memeriksa
  konstelasi node teal via magnifier ring gold.
- **banner-pro** — headline "One Research Desk for Serious Decisions." +
  tagline gold; VISUAL robot head + radar sweep gold + bar ranking slate.
- **banner-ultimate** — headline "Crypto. Equities. AI & Tech. One
  Subscription." + tagline teal; VISUAL robot visor teal + 3 orbit teal +
  inti diamond gold.
- **banner-trust** — headline "We Grade Ourselves. In Public." + tagline
  gold; VISUAL robot head + ledger line dengan tick lime/rose (track record).
- **page-universe** — "Rank What Matters." · visual: tangga 5 bar gold +
  2 node teal.
- **page-mirror** — "History Rhymes. Find It." · visual: dua konstelasi teal
  berhadapan via garis cermin gold.
- **page-origin** — "Know Who Is Selling." · visual: graph entitas — node
  gold pusat + spoke ke node teal/abu.
- **page-multiverse** — "Every Decision Has Branches." · visual: garis gold
  bercabang tiga (1 solid, 2 dashed teal).
- **page-edge** — "Test Your Thesis Before the Market Does." · visual: 3
  slider track slate dengan knob gold + tick teal.
- **page-studio** — "Research In. Citations Out." · visual: outline dokumen
  hairline, tiap baris berakhiran glyph chain-link teal, satu baris gold.

(Setiap headline diikuti subline/tagline "Know the Intent. See the Signal."
warna gold/teal sesuai aksen; "No other text, no watermark.")

## 4. Aset masa depan (tanpa teks — overlay HTML)

| id | Kebutuhan | Final | Generate | Strategi |
|---|---|---|---|---|
| `og-intent` | OG/share — **TERPASANG** di metadata layout & /upgrade | 1200×630 | 16:9 | A band 60% |
| `email-header` | Header email — siap pakai untuk kampanye | 600×200 | 16:9 | A band 40% |
| `truthcard-bg` | Latar Truth Card — **TERPASANG** di /api/og/truth-card | 1200×675 | 16:9 | A band 70% |

## 5. QC sebelum tayang

- [ ] Headline/tagline English dieja 100% benar (zoom; regenerate bila typo).
- [ ] Logo + wordmark hadir, tidak terdistorsi; visual robot sesuai konteks.
- [ ] Tidak terpotong di mobile 360px (band tengah) & rasio tampil §2.
- [ ] CTA HTML tidak menutup teks banner; kontras ≥ AA (scrim).
- [ ] ≤ ±1.5 MB/PNG; aksen gold=Pro / teal=Ultimate.
- [ ] Copy UI di slot tersebut mengikuti locale (en/id) — cek switcher bahasa.

*Terakhir diperbarui: 2026-08-15 · sinkron `promo-surfaces.tsx`,
`src/app/loading.tsx`, i18n `locales/{en,id}.ts`.*
