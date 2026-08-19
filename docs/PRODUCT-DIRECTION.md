# PRODUCT DIRECTION — INTENT = Decision Intelligence for Crypto Due Diligence

> Status: **ADOPTED** (approval founder 2026-08-17). Dokumen ini mengikat
> seluruh sesi build berikutnya: struktur brief, framing, dan postur desain.
> Implementasi pertama: `src/services/decision-brief.ts` +
> `src/components/shell/brief-client.tsx` + `/api/brief/[slug]`.

## Posisi

INTENT membantu pengguna menjawab:
*“Dengan bukti yang tersedia hari ini, apakah proyek ini layak mendapatkan
alokasi uang, waktu, atau tenaga — dan apa yang harus terjadi agar keputusan
ini berubah?”* — bukan “coin ini naik atau tidak”.

**Framing utama:** “Make decisions you can defend.” /
“Ambil keputusan yang bisa Anda pertanggungjawabkan.”
Alternatif uji discovery: “Clarity before commitment.” ·
“Evidence before exposure.” · “Know what would change your mind.”

Emotional job: pengguna merasa *“saya tahu apa yang saya lakukan, apa yang
belum saya tahu, dan saya tidak mempertaruhkan modal/reputasi karena narasi.”*

## Premium Decision Brief — 7 seksi (urutan layar = hierarki)

1. **The Decision** — headline = keputusan user (bukan nama proyek): jenis
   alokasi (uang/waktu/tenaga), horizon, batas eksposur yang diuji, apa yang
   belum diputuskan. Empat pertanyaan “Layakkah…: masuk watchlist diligence /
   10 jam riset lanjutan / risk budget eksploratif / berkontribusi ekosistem”.
2. **Current Read** — kesimpulan terkalibrasi, BUKAN buy/sell:
   `Proceed to diligence · Monitor, not commit · Defer pending evidence ·
   Avoid / insufficient evidence` + tiga dimensi terpisah (tanpa kepastian
   palsu): **Evidence quality · Pattern confidence · Trajectory uncertainty**.
3. **What Changed / Why It Matters** — sinyal apa yang berubah + mengapa ia
   mengubah kualitas keputusan; tiap item: as-of, sumber, dampak tesis,
   dampak keyakinan. Brief terasa hidup, bukan laporan statis.
4. **Evidence Ledger** — jantung premium: klaim → passage → sumber → waktu →
   evidence level → konflik/batasan. Data kosong/tua/bertentangan =
   **Unknown eksplisit**. *Premium = user tahu persis apa yang diketahui,
   seberapa baik, dan apa yang belum.*
5. **Historical Analogs** — kemiripan struktural + **mismatch** + konteks
   pasar saat peristiwa + urutan decision event + hasil setelahnya + alasan
   relevan/tidak. Framing: “pola ini pernah muncul dalam kondisi tertentu;
   berikut batas perbandingannya” — bukan prediksi deterministik.
6. **Red Team: Risks, Unknowns & Dissent** — setara visual dengan tesis:
   bukti pelemah, risiko struktural, konflik kepentingan, data hilang, bias
   historis, interpretasi alternatif. *INTENT tidak menjual keyakinan.*
7. **Decision Gates** — disiplin, bukan instruksi transaksi: sinyal pantauan,
   kondisi invalidation, aksi paling reversibel berikutnya, tanggal tinjau
   ulang, bukti baru paling bernilai untuk dicari.

## Aturan desain (postur visual)

- Editorial, tenang, presisi, skeptis konstruktif. Obsidian netral; aksen
  emas sangat terbatas; mono HANYA untuk timestamp/sumber/confidence/data.
- Ruang kosong di area kesimpulan; kepadatan terkontrol di evidence.
- TIDAK ada grafik harga sebagai pusat layar; TIDAK ada estetika kasino
  (neon, roket, FOMO, countdown, angka performa tanpa bukti).
- **Bukti & sitasi tidak boleh dipaywall atau dikubur — mereka adalah produk.**
  Tier gratis tetap melihat Evidence Ledger + Current Read; lapisan
  interpretasi (intel summary, analog drill-down, red team) = scope berbayar.

## Hierarki layar

1. Atas: The Decision + Current Read + 3 dimensi.
2. Tengah: Why it matters + klaim utama.
3. Dalam: Evidence ledger + analog drill-down.
4. Sisi/bawah: Red team, invalidation, review date, watch conditions.

## Discovery & gate (catatan proses)

- **Instrumen A/B live** (2026-08-17): `src/lib/ab.tsx` — varian A
  "Make confident decisions." vs B "Make decisions you can defend.";
  assignment deterministik per visitor; exposure + checkout_start ter-track
  via `/api/track`; funnel tersedia di `/api/metrics` (admin) sebagai
  `framing.expose_A/B` & `framing.checkout_A/B`. Permukaan uji: eyebrow hero
  `/upgrade` + baris framing modal entry.

- Uji A/B framing: “confident” vs “defensible” (hipotesis: B).
- Kill criteria: brief dipersepsikan checklist administratif; user tetap
  minta buy/sell; provenance tidak dipercaya; tak ada perubahan perilaku
  keputusan setelah 2 siklus.
- Dissent CMO diterima: setiap layar/copy harus tertambat pada keputusan,
  bukti, ketidakpastian, dan konsekuensi nyata — bukan jargon premium.
