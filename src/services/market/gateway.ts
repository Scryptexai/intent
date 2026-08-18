import { logger } from "@/services/logger";

/**
 * ── Market data gateway (anti-boncos, docs/DATA-SOURCES.md) ─────────────────
 * Semua panggilan eksternal lewat sini: cache TTL + budget counter harian +
 * circuit breaker + fallback chain. Bila provider tak terjangkau (sandbox/
 * offline) → null → permukaan radar jatuh ke data internal (jujur, $0).
 */

interface CacheEntry {
  at: number;
  data: unknown;
}
const cache = new Map<string, CacheEntry>();
const budget = new Map<string, { day: string; n: number }>();

const LIMITS: Record<string, number> = {
  binance: 500,
  defillama: 300,
  hyperliquid: 300,
  dexscreener: 200,
  coingecko: 100,
  etherscan: 500,
};

function budgetOk(provider: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const b = budget.get(provider);
  if (!b || b.day !== day) {
    budget.set(provider, { day, n: 0 });
    return true;
  }
  return b.n < (LIMITS[provider] ?? 200);
}
function budgetInc(provider: string) {
  const day = new Date().toISOString().slice(0, 10);
  const b = budget.get(provider) ?? { day, n: 0 };
  b.n += 1;
  budget.set(provider, b);
}

const FAIL_TTL = 10 * 60_000; // circuit breaker: gagal sekali → skip 10 menit

export async function gatewayGet<T>(provider: string, url: string, ttlMs: number): Promise<T | null> {
  const key = `${provider}:${url}`;
  const hit = cache.get(key);
  if (hit) {
    const ttl = hit.data === null ? FAIL_TTL : ttlMs;
    if (Date.now() - hit.at < ttl) return hit.data as T;
  }
  if (!budgetOk(provider)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "User-Agent": "cif-intent/0.2" } });
    if (!res.ok) {
      cache.set(key, { at: Date.now(), data: null });
      return null;
    }
    const data = (await res.json()) as T;
    cache.set(key, { at: Date.now(), data });
    budgetInc(provider);
    return data;
  } catch (e) {
    cache.set(key, { at: Date.now(), data: null });
    logger.warn("market", `${provider} unreachable → internal fallback (cached 10m)`, { url: url.slice(0, 80), err: String(e) });
    return null;
  }
}

/** Binance public futures: funding + open interest (no key). */
export async function binancePerp(symbol: string): Promise<{ funding: number; oi: number; mark: number } | null> {
  const prem = await gatewayGet<{ lastFundingRate: string; markPrice: string }[]>(
    "binance",
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`,
    5 * 60_000,
  );
  const oi = await gatewayGet<string>("binance", `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`, 5 * 60_000);
  if (!prem || Array.isArray(prem) === false) return null;
  const p = prem as unknown as { lastFundingRate: string; markPrice: string };
  return { funding: Number(p.lastFundingRate), mark: Number(p.markPrice), oi: oi ? Number(oi) : 0 };
}

/** DefiLlama TVL history (no key). */
export async function defillamaTvlChain(protocol: string): Promise<{ date: number; totalLiquidityUSD: number }[] | null> {
  return gatewayGet("defillama", `https://api.llama.fi/v2/historicalChainTvl?protocol=${encodeURIComponent(protocol)}`, 60 * 60_000);
}

/** DexScreener pair depth for a token symbol (no key). */
export async function dexscreenerDepth(symbol: string): Promise<{ liquidityUsd: number; pair: string } | null> {
  const d = await gatewayGet<{ pairs?: { liquidity?: { usd?: number }; pairAddress?: string }[] }>(
    "dexscreener",
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,
    15 * 60_000,
  );
  const best = (d?.pairs ?? [])[0];
  return best ? { liquidityUsd: best.liquidity?.usd ?? 0, pair: best.pairAddress ?? "" } : null;
}
