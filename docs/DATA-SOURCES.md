# DATA SOURCES — katalog API eksternal (low-cost first, anti-boncos)

> Prinsip: tahap validasi = **$0/bulan** untuk data. Semua provider free/no-key
> dengan fallback chain + cache. Provider berbayar hanya setelah product-market
> fit terbukti (lihat §4). Tier ditulis per 2026-08 — verifikasi sebelum depend.

## 1. Katalog (prioritas)

| Provider | Data | Key? | Free limit (±) | Memakai di | Fallback | Cache TTL |
|---|---|---|---|---|---|---|
| **DefiLlama** | TVL per protokol/chain, volume DEX, yields, stablecoins, **unlock calendar**, coins | ❌ tidak perlu | ~1 req/s sopan | base Sentinel, lensa unlock-overhang, yields, movers | snapshot internal | 1 jam (TVL), harian (unlocks) |
| **Binance public** | klines spot/perp, **funding rate, open interest, top-trader long/short** | ❌ | ~1200 weight/menit | lensa divergensi funding/OI/basis (inti persona advance) | Bybit → OKX public | 5 menit |
| **Hyperliquid API** | perp meta, OI, funding, volume per market | ❌ | longgar | lensa perps (pasar persona) | Binance | 5 menit |
| **DexScreener** | pairs, liquidity, pooled info, token boosts | ❌ | ~300 req/menit | kedalaman likuiditas token awal/pre-CEX (diferensiator vs Nansen) | internal | 15 menit |
| **CoinGecko** | market cap, categories, global | ✅ free 30 req/menit | movers & categories | DefiLlama `/coins` | 15 menit |
| **Etherscan** | token txs, holders, large transfers (whale tape ETH) | ✅ free 5 req/s | whale tape | public RPC logs | 15 m + harian |
| **Solana public RPC** | signatures/token accounts (whale tape SOL) | ❌ | rate-limit per IP | whale tape | Helius free (100k kredit) | 15 menit |
| **CryptoPanic** | news aggregate | ✅ dev free | lensa news | RSS langsung | 15 menit |
| **Public RPC (ETH/SOL)** | eth_call/verifikasi on-chain ad-hoc | ❌ | terbatas | panel verifikasi | — | on-demand |

**Estimasi biaya tahap 0: $0/bulan** (Vercel hobby + Supabase/Neon free tier).

## 2. Guardrails anti-boncos (engineering)

- Semua pemanggilan lewat **gateway** `src/services/market/*`: rate-limiter per
  provider + response cache (TTL di atas) + circuit breaker + **budget counter
  harian** (env `MKT_BUDGET_*`), log ke audit.
- Client **tidak pernah** memegang API key; endpoint no-key boleh dipanggil
  client-side bila perlu (tetap via gateway untuk cache).
- Fallback chain otomatis (Binance→Bybit→OKX; CoinGecko→DefiLlama) supaya
  perubahan tier satu provider tidak mematikan fitur.
- Cron refresh (Vercel) menulis cache, bukan request on-demand per user →
  biaya konstan tak peduli jumlah user (penting sebelum PMF).
- Fitur berbayar-provider (Dune, dsb.) di-flag `POST_PMF` di kode & roadmap.

## 3. Mapping permukaan produk ↔ sumber (niche: retail advance bermodal)

| Permukaan | Sumber | Kenapa niche ini peduli |
|---|---|---|
| **Edge Radar** (home): divergensi funding-vs-price, OI surge, unlock-overhang-vs-momentum, TVL-vs-harga | Binance/Hyperliquid + DefiLlama | mereka bertindak di *struktur*, bukan berita |
| **Whale tape** | Etherscan + Solana RPC | konfirmasi aliran besar sebelum masuk/keluar |
| **Thesis Validator** (Brief): cross-check pattern+evidence + *falsifier* | internal dossier (0 biaya) + DexScreener (likuiditas) | mereka punya tesis; butuh yang mem-falsifikasi, bukan sinyal |
| **Unlocks lensa** | DefiLlama unlocks | projected sell-pressure = bahasa mereka |
| Morning movers | CoinGecko/DefiLlama | konteks harian 30 detik |
| Studio/Truth Cards | internal | output bersitasi = diferensiasi |

## 4. Hindari sekarang (boncos / salah pasar)

Nansen/Arkham/Glassnode/Santiment/LunarCrush (mahal, dan kita *bukan* telemetri
on-chain), Dune Pro, push-notif berbayar, scraping sosial rapuh. Setelah PMF:
Dune untuk graph, webhook berbayar untuk alert real-time.
