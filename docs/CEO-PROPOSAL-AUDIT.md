# AUDIT — kesesuaian implementasi terhadap Proposal CEO
# "INTENT = Decision Intelligence for Crypto Due Diligence"

> Cara baca: ✅ done · 🟡 parsial (sebutkan sisa) · ⏳ proses (bukan build).
> Referensi implementasi dicantumkan per butir. Audit per 2026-08-17.

## A. Posisi & framing

| Butir proposal | Status | Implementasi |
|---|---|---|
| Posisi: bantu jawab “layak alokasi uang/waktu/tenaga & apa yang mengubah keputusan”, bukan “naik/turun” | ✅ | `services/decision-brief.ts` (The Decision), copy seluruh permukaan |
| Framing utama “Make decisions you can defend.” (+ID) | ✅ | eyebrow `/brief`, hero `/upgrade` (varian B), OG, `docs/MARKETING.md` |
| Alternatif framing diuji, bukan diputuskan internal | ✅ | instrumen A/B live `lib/ab.tsx` + funnel `/api/metrics` |
| Emotional JTBD (tidak mempertaruhkan modal/reputasi karena narasi) | ✅ | copy marketing & upgrade (MARKETING.md §framing) |
| Dissent CMO: copy tertambat pada keputusan/bukti/ketidakpastian, bukan jargon | ✅ | rubric uji cepat 5 pertanyaan (BRIEF-RUBRIC.md) |

## B. Tujuh seksi Premium Decision Brief

| # | Butir | Status | Implementasi / sisa |
|---|---|---|---|
| 1 | The Decision: jenis alokasi, horizon, batas eksposur, apa yang belum diputuskan, 4 pertanyaan “Layakkah…” | ✅ | `decision.open/horizon/exposure/allocation` + 4 q (i18n) |
| 2 | Current Read 4-kategori + 3 dimensi terpisah (EQ/PC/TU) | ✅ | `read.conclusion` + 3 meter; label i18n |
| 3 | What Changed: as-of + sumber + dampak tesis + **dampak keyakinan** | ✅ | `changed[]` incl. `confidenceImpact` (ditutup di audit ini) |
| 4 | Evidence Ledger: klaim→passage→sumber→waktu→level→konflik/batasan; Unknown eksplisit; tidak dipaywall | ✅ | `ledger[]` + `unknowns[]`; tampil saat locked |
| 5 | Analogs: struktural + mismatch + konteks + **urutan decision event** + hasil + relevansi | ✅ | `analogs[].sequence` dari dossier analog (ditutup di audit ini) |
| 6 | Red Team setara visual: bukti pelemah, risiko, **ketergantungan/konflik kepentingan**, data hilang, bias, dissent | ✅ | `redTeam.{risks,dissent,conflicts,dependencies}` (dependencies ditutup di audit ini); “data hilang” via `unknowns` |
| 7 | Decision Gates: watch, invalidation, aksi reversibel, review date, bukti untuk dicari | ✅ | `gates.*` |

## C. Prinsip desain & hierarki layar

| Butir | Status | Catatan |
|---|---|---|
| Surface Command/Inspect (fokus, drill-down bukti) | ✅ | command palette typeahead 6 katalog + deep-link; brief = objek inspeksi |
| Editorial/tenang; obsidian; aksen emas terbatas; mono hanya data/timestamp/sumber | ✅ | postur halaman brief; banner tanpa hype |
| Ruang kosong di kesimpulan; kepadatan terkontrol di evidence | ✅ | layout brief v2 |
| Tanpa grafik harga sebagai pusat; tanpa estetika kasino | ✅ | telemetry = kartu kecil; FOMO/neon/countdown dihapus sejak rebrand |
| Hierarki: atas Decision+Read+3 dimensi; tengah why/klaim; dalam ledger+analog; bawah red team+gates | ✅ | urutan seksi brief-client |
| Bukti & sitasi tidak dipaywall/dikubur | ✅ | ledger+gates gratis saat locked; interpretasi = scope berbayar (P7) |

## D. Resource & gate proses

| Butir | Status | Catatan |
|---|---|---|
| Tahap 1: rubric kualitas + contoh premium brief | ✅ | `docs/BRIEF-RUBRIC.md` |
| Tahap 2: prototipe 3–5 kasus historis | ✅ | 3 exemplars (Ethena/Blur/LayerZero) live via overlay `lib/data/exemplars.ts` |
| Tahap 3: discovery tertutup responden | ⏳ | instrumen A/B siap; butuh responden nyata (di luar sandbox) |
| Gate “tanpa build produksi/pricing/publikasi/klaim performa” | 🟡 | pricing & situs publik **sudah ada sebelum proposal** (keputusan founder terdahulu); yang dijaga: tidak ada klaim performa/akurasi di copy (MARKETING.md §angka-klaim wajib merujuk track record). **Keputusan founder diperlukan**: tahan deploy sampai discovery, atau lanjut dengan instrumen A/B berjalan. |
| Kill criteria terdokumentasi | ✅ | BRIEF-RUBRIC.md + PRODUCT-DIRECTION.md |

## E. Ringkasan gap yang DITUTUP pada audit ini (2026-08-17)

1. `confidenceImpact` per item What-Changed (+render +i18n).
2. `sequence` (urutan decision event) pada setiap analog.
3. `dependencies` (ketergantungan/konflik kepentingan) pada Red Team.

## F. Sisa non-build (keputusan/proses manusia)

- Cakupan `sequence` analog & `dependencies` tergantung cakupan dossier upstream
  (CIF scale 27→1000, relationships=0) — field & render siap, isi mengikuti data.
- Responden discovery Tahap 3 + review rubric mingguan.
- Keputusan gate deploy vs discovery (butir D.4).
- Branch protection main + aktivasi CI (salin `ci/ci-workflow.template.yml`).

*Owner audit: sesi build · referensi: docs/PRODUCT-DIRECTION.md, docs/BRIEF-RUBRIC.md.*
