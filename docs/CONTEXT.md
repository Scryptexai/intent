# CONTEXT — tujuan platform INTENT

## Apa ini

**INTENT** adalah aplikasi consumer dari **Crypto Intelligence Framework (CIF)**:
strategic co-pilot untuk user crypto advanced dengan branding *Forensic
Intelligence* (`#0B0E11 / #161B22 / #2563EB / #F59E0B`, Inter + JetBrains Mono).

Repo upstream **Scryptexai/crypto-intelligence-framework** adalah *knowledge
repository*: `docs/`-nya berisi container/aturan (bukan knowledge), knowledge
tervalidasi hidup di `examples/` + ekspor mesin `poc/*.json`. INTENT tidak
menyimpan knowledge baru — ia **mengkonsumsi** ekspor locked tersebut.

## Prinsip posisi (diadopsi dari ApplicationBlueprint upstream — masih cair!)

Blueprint produk upstream belum final; yang **LOCKED adalah skema data**
(`cif-export/1`). Aturan posisi berikut dipakai sebagai *design guidance*
sampai upstream mengunci/merevisinya:

1. **Copilot due-diligence historis, bukan oracle prediksi.** Output difrasakan
   "N decision events serupa berakhir begini, confidence X, karena Y" — tidak
   pernah "proyek ini akan sukses".
2. **Diferensiator struktural**: proyek pre-token/testnet/points *tak terlihat*
   oleh on-chain analytics (Nansen/Arkham), tapi terlihat oleh reasoning
   DecisionEvent CIF.
3. **Trust architecture tiga lapis** (ship bersamaan): panel sitasi satu-klik
   per claim; badge Evidence Level per-fakta terpisah dari badge level-pattern
   (instances + era-`scope` warning); Track Record publik dengan *as-of date vs
   event date*.
4. **Monetisasi**: gate *scope & kontinuitas*, jangan pernah gate *trust-depth*
   (rantai sitasi/evidens tetap tampil di tier gratis). Free = Today's Pick +
   browsing ranking; Pro = laporan penuh + export/comparison/watchlist/API.
5. **Current Read**, bukan prediksi biner: *Pattern Confidence* (kekuatan
   metodologi) + *Trajectory Probability* (kemiringan state), label terpisah;
   *Signal-to-watch* wajib punya trigger objektif + komitmen grading publik.
6. **CIF Score = kelengkapan riset kita** (6 dimensi: Research Quality,
   Consistency, Evidence, Coverage, Conflict, Knowledge) — **bukan** kesehatan
   proyek; jangan pernah di-forecast, jangan ditampilkan sebagai verdict proyek.
7. **Content Studio** draft dari dossier bersitasi CIF sendiri; citation trail
   tidak boleh putus di output template.

## Unit kausal inti

`DecisionEvent` = Context → Trigger → Decision → Alternatives → Reason →
Execution → Stakeholder Reactions (8 POV: Founder/VC/Retail/Community/Developer/
Institution/Validator/Builder) → Short/Long-term Outcome → Observable Factors →
**Hidden Factors** (motivation/constraint/pressure/trade-off; `unknown` bila tak
grounded) → Evidence Level. Pattern = shape berulang lintas DecisionEvent
(P1–P16 di registry, confidence = instances: ≥3 HIGH · 2 MEDIUM · 1 LOW, dengan
`scope` era — pattern di luar scope = weakly transferable + wajib warning).

## Modul INTENT ↔ sumber data

| Modul | Data locked (Supabase/snapshot) | Data demo universe |
|---|---|---|
| The Sentinel `/` | chip catalog + status bridge | scan z-score 500 proyek, anomaly_logs |
| The Mirror `/mirror` | registry P-codes (confidence/scope/prediction) | vektor cosine 43-d, analog top-3 |
| The Origin `/origin` | 1.154 entities (explorer LIVE) | actor-claims ledger, truth matrix |
| The Multiverse `/multiverse` | 289 Decision Events (dossier kausal) | chain sintetis + Add Branch |
| The Edge `/edge` | — (Pro) | Monte-Carlo 1.000 path per variabel |
| Content Studio `/studio` | knowledge + evidenceText sebagai bahan | streaming AI / local composer |
| Project Detail `/project/[slug]` | dossier penuh: qa/behavior/conflicts/DE/entities/knowledge/timeline | telemetry Observable placeholder |

## Relasi repo & kepemilikan (EnterpriseRoadmap upstream)

- Lane **[data]** = repo upstream (pipeline riset, skala dataset, sync Supabase).
- Lane **[frontend/backend]** = repo ini (permukaan produk, integrasi, serving).
- Gap upstream yang berdampak ke sini: `relationships` = 0 baris (graph surface
  harus empty-state jujur), CIF Score baru 1/27 (Arbitrum), 0 live graded calls
  (calibration track record = gap bernilai tertinggi), field sintesis
  `cif_projects` (pattern_confidence/trajectory_probability/current_read/signal/
  observable/comparables) masih null sampai langkah sintesis upstream dibangun —
  UI harus render hanya bila non-null.
