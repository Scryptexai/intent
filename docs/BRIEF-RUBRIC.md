# BRIEF RUBRIC — standar kualitas Premium Decision Brief

> Tahap 1 arah produk (docs/PRODUCT-DIRECTION.md). Rubric ini dipakai untuk
> menilai setiap brief (manual review mingguan + otomatisasi parsial),
> dan menjadi acceptance criteria bagi `src/services/decision-brief.ts`.
> Skor 0–2 per dimensi; brief premium minimal **total ≥ 20/28** dan
> **tidak boleh ada dimensi bernilai 0**.

## Dimensi (bobot sama)

| # | Dimensi | 0 (gagal) | 1 (dasar) | 2 (premium) |
|---|---|---|---|---|
| 1 | **Decision-anchored** | Headline = nama proyek / harga | Ada jenis alokasi & horizon | 4 pertanyaan “Layakkah…” + eksposur yang diuji + apa yang belum diputuskan |
| 2 | **Kalibrasi read** | Buy/sell atau angka tanpa label | Kesimpulan kategorikal | Kesimpulan 4-kategori + 3 dimensi terpisah (EQ/PC/TU), tanpa kepastian palsu |
| 3 | **What changed** | Laporan statis | Ada delta angka | Tiap delta: as-of + sumber + dampak tesis + dampak keyakinan |
| 4 | **Evidence ledger** | Narasi tanpa sitasi | Sitasi ada tapi dikubur | Klaim→passage→sumber→waktu→level→konflik/limitasi; **Unknown eksplisit** bila data tipis |
| 5 | **Analog disiplin** | “X mirip Y maka sama” | Ada analog + similarity | + mismatch + konteks saat peristiwa + hasil setelahnya + derajat relevansi |
| 6 | **Red team setara tesis** | Tidak ada / di footer | Ada daftar risiko | Bukti pelemah + dissent + konflik kepentingan + bias historis, visual setara |
| 7 | **Decision gates** | Instruksi transaksi | Ada watchlist | Watch + invalidation + langkah paling reversibel + review date + bukti untuk dicari |

## Uji cepat (5 pertanyaan audit)

1. Bisakah pembaca menjelaskan kembali **keputusan** yang diuji (bukan proyeknya)?
2. Bisakah ia menunjuk **sumber** setiap klaim dalam satu klik?
3. Apakah brief menyebut **apa yang tidak diketahui** secara eksplisit?
4. Apakah ada kalimat yang mengatakan **kapan read ini batal**?
5. Apakah langkah berikutnya **reversibel** (bukan komitmen)?

Jawaban “tidak” pada salah satu = brief tidak lolos premium, apa pun skornya.

## Exemplars (Tahap 2)

Tiga kasus kurasi sebagai reference implementation — konten kurasi manusia
ditumpangkan di atas pipeline otomatis via `src/lib/data/exemplars.ts`:

1. **Ethena (sUSDe loop)** — kasus risk-structure: inflation TVL, taper risk.
2. **Blur (season-2 claim cohort)** — kasus dump-shape: vesting-cliff behavior.
3. **LayerZero (sybil & airdrop allocation)** — kasus pre-TGE: tak terlihat
   on-chain analytics, terlihat oleh reasoning Decision-Event.

Proses: tulis manual → bandingkan dengan output pipeline → selisihnya
menjadi backlog perbaikan `decision-brief.ts`. Review tiap Jumat.

## Kill criteria (dari PRODUCT-DIRECTION)

Hentikan/pivot bila: brief dipersepsikan checklist administratif; user tetap
hanya meminta buy/sell; provenance tidak dipercaya; tidak ada perubahan
perilaku keputusan setelah dua siklus discovery.
