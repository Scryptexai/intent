# PRODUCT — brainstorming & design principles (value-aligned)

> Status: BRAINSTORM (2026-08-12). Dokumen ini mengunci *mengapa* bentuk produk
> harus begini; eksekusi bertahap setelah keputusan maintainer (lihat §7).

## 0. NICHE LOCK (keputusan maintainer 2026-08-12)

**Pasar spesifik: retail investor crypto ADVANCE — bisa analisa, punya modal
(≈ $10k–$500k risk budget).** Airdroper = sekunder/opsional, BUKAN pasar utama.
Anti-persona (jangan didesain untuk): pemula total, pencari sinyal "coin apa",
pemburu airdrop murni, trader leverage degenerate.

Analogi mie-ayam-vs-warteg: bahan (data) sama; yang membedakan = **resep &
tempat** (design). Resep INTENT untuk niche ini:

- **Jargon ON, densitas tinggi**: funding/OI/basis/unlock/POV flows default tampil;
  tanpa onboarding edukasi; vibe terminal riset, bukan app konsumen.
- **Falsification-first**: setiap read wajib menampilkan "what would change my
  mind" + trigger terukur — alat disiplin riset, BUKAN feed sinyal.
- **Capital-aware**: framing risiko per confidence tier (bentuk posisi), tidak
  pernah "buy this"; posisi kita = research co-pilot, bukan grup sinyal.
- **Tenang & forensik**: tanpa gamifikasi/streak/copy moon; trust = estetika.
- **Entry = jobs**: "validasi tesisku", "apa yang berubah semalam", "berbahayakah
  unlock ini?", "siapa yang jual (POV retail vs VC)?" — bukan nama modul.
- **Pricing psikologi**: $49/bulan = biaya riset vs modal yang dipertaruhkan.

Konsekuensi desain: home = **Edge Radar** (divergensi struktur yang bisa mereka
aktkan: funding-vs-price, OI surge, unlock-vs-momentum, TVL-vs-harga, whale tape),
bukan dashboard generik; data eksternal $0/bulan (lihat `DATA-SOURCES.md`).

## 1. Siapa yang membayar & value yang dibeli (JTBD)

| Persona | Job-to-be-done | Value yang DIBAYAR (bukan fitur) |
|---|---|---|
| Analis fund / VC | "Due-diligence 3–5 proyek/minggu yang layak IC" | **Jam analis**: diligence 2–4 jam → brief terverifikasi 10 menit + memo siap-IC; **coverage** lebih luas dengan orang yang sama |
| Researcher / KOL | "Take berbeda & defensible" | **Edge naratif**: klaim bersitasi yang tidak dimiliki orang lain; pertumbuhan audiens |
| Pro retail serius | "Jangan kena -90%; catch asimetris pre-TGE" | **Risk-avoidance** (pattern warning) + **pre-TGE visibility** yang secara struktural tidak terlihat oleh Nansen/Arkham (diferensiator inti) |

Insight: user tidak membayar "6 modul". Mereka membayar **jawaban + keyakinan + bukti + rekam jejak**, secepat mungkin, yang bisa mereka **jadikan output** (memo/thread) untuk atasan/audiens mereka.

## 2. Aset unik kita (moat yang harus menjadi wajah produk)

1. **Decision Events terstruktur** (Context→Trigger→Decision→8-POV reactions→Hidden factors→outcomes) + sitasi — tidak dimiliki kompetitor dalam bentuk terstruktur.
2. **Pattern registry** dengan `scope` era + `confidence` berbasis instances + disiplin kalibrasi.
3. **Knowledge items ber-Evidence-Level** (1.039+).
4. **Entity graph** (1.154) untuk contagion/counterparty risk.
5. **Studio** yang mengubah 1–4 menjadi output shareable **tanpa memutus rantai sitasi**.

Produk harus memperlihatkan aset ini dalam **30 detik pertama** ("aha moment"): satu layar yang memberi verdict + "kenapa" + bukti yang bisa diklik.

## 3. Prinsip desain produk (P1–P7)

- **P1 Answer-first, tools-second.** Setiap layar dimulai dari *jawaban* (verdict + confidence + evidence); tools (Mirror/Simulator/Multiverse) adalah "buka reasoning", bukan pintu masuk.
- **P2 Atom produk = Decision Brief** per proyek: Current Read (Pattern Confidence / Trajectory Probability, label terpisah), 3 kenapa teratas (patterns + analogs), evidence chain satu-klik, *what would change my mind* (triggers yang di-watch), track record read serupa, aksi (watch / simulate / export / draft).
- **P3 Home = Morning Brief** (habit loop harian): delta semalam — anomali watched, movers ranking, pattern baru triggered, hasil kalibrasi. Bukan dashboard statis.
- **P4 Trust visible**: as-of date di semua angka; provenance tag (on-chain / dossier / inference); badge kalibrasi melekat pada setiap read.
- **P5 Output is the product**: IC-memo satu-klik (print/PDF), thread bersitasi, Truth Card — lahir dari Brief, bukan dari editor kosong.
- **P6 Empty = honest**: coverage gap ditampilkan sebagai gap (+ request coverage), tidak pernah sebagai data palsu.
- **P7 Pricing = value units**: gate *scope & kontinuitas*, jangan gate trust-depth (sitasi & evidence gratis selamanya — ini magnet konversi).

## 4. Usulan arsitektur informasi (job-centric)

```
/                    Morning Brief (home) — delta harian + watched
/brief/[slug]        Decision Brief (atom) — sections: Read · Why · Evidence ·
                     Change-my-mind · Track record · Actions
/universe            Ranking + search + watchlist (tabel sortable, export CSV)
/studio              Output workspace (diberi konteks oleh Brief)
/track-record        Trust layer publik
Tools (deep-dive):   /mirror /origin /multiverse /edge — dipertahankan sebagai
                     "full tool view", dicapai dari section di Brief
```

Nav: grup **Daily** (Brief, Universe, Track Record) + **Create** (Studio) + **Tools**
(Mirror/Origin/Multiverse/Edge). Nama puitis dipertahankan sebagai nama *tools*
(branding), bukan sebagai pintu masuk utama.

## 5. Penyelarasan pricing ke value units

| Tier | Harga | Value units |
|---|---|---|
| Free | $0 | Ranking + Today's Pick + **1 Brief/hari** + sitasi penuh (trust-depth gratis) |
| Pro | $49 | Brief unlimited + alerts real-time + export memo/CSV + API v1 + Edge |
| Enterprise | custom | Tim/SSO/audit/white-label + SLA |

Trial 30 hari Pro = waktu membentuk habit daily-brief (loop P3). Konversi diukur
di akhir trial; reminder = "brief yang akan kamu kehilangan aksesnya".

## 6. Metrik "value delivered" (bukan vanity)

- **Activation**: export/share pertama ≤ sesi pertama.
- **Time-to-brief**: < 60 dtk dari buka app → verdict bersitasi terlihat.
- **Briefs/week, exports/week, alert→action rate** (watch/simulate/draft dari alert).
- **Calibration score** tren (trust compound).
- **D7/D30 retention** & trial→paid conversion.
Instrumentasi: event internal ringan (`/api/track`) + panel admin.

## 7. Urutan build — STATUS: IA job-centric DIEKSEKUSI (sesi 2026-08-12, pilihan maintainer: job-centric penuh)

- `/` Morning Brief + Edge Radar (internal-first $0, enrichment Binance public bila terjangkau, failure-cache 10m).
- `/brief/[slug]` atom: verdict PC/TP berlabel · why (registry patterns scope/confidence) · analogs · evidence satu-klik · change-my-mind · track record · actions.
- `/universe` ranking sortable + watch + CSV.
- Nav job-centric (Daily/Create/Tools); modul lama = Tools.
- Gating value-units: Free = 1 brief/hari (anon ikut kuota); Pro/trial unlimited (402 preview).
- Instrumentasi `/api/track` + `/api/metrics` (admin): brief_views/exports/shares/watches/generations.

1. `/brief/[slug]` (rakit dari services yang ADA: read+patterns+analogs+evidence+triggers+track-record+actions) — value terlihat tanpa modul-hopping.
2. Home **Morning Brief** (delta: anomalies watched, movers 30d, calibration baru).
3. `/universe` ranking sortable + watch + CSV.
4. Nav job-centric + gating pricing baru (Free = 1 brief/hari).
5. Instrumentasi event + panel metrik.
6. Polish output: IC-memo template升级 (cover, appendix sitasi).

Risiko yang dijaga: Brief jangan menjadi dinding teks (progressive disclosure:
verdict → 3 bullet why → expand); rename jangan membuang deep-link lama (redirect).
