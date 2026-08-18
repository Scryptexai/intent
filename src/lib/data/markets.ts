import { hashSeed, mulberry32, range, round } from "@/lib/prng";
import type { MarketId } from "@/lib/domain";

/**
 * Cakupan multi-market untuk tier Ultimate.
 * Dataset demo deterministik (seed stabil) dengan bentuk row yang sama
 * dengan universe kripto, sehingga tabel & ranking bisa dipakai ulang.
 * Skor: 50% momentum 30d + 30% sentiment + 20% pattern heat (konsisten dgn kripto).
 */

export interface MarketRow {
  slug: string;
  name: string;
  ticker: string;
  category: string;
  /** TVL (kripto) / market cap / nilai pasar global (dalam USD) */
  valueUsd: number;
  vol: number;
  m30: number;
  sentiment: number;
  score: number;
}

type Def = [name: string, ticker: string, category: string, capB: number];

const STOCKS: Def[] = [
  ["Apple", "AAPL", "Technology", 3400],
  ["Microsoft", "MSFT", "Technology", 3300],
  ["NVIDIA", "NVDA", "Semikonduktor", 3000],
  ["Amazon", "AMZN", "Konsumer", 2200],
  ["Alphabet", "GOOGL", "Komunikasi", 2100],
  ["Meta", "META", "Komunikasi", 1500],
  ["Broadcom", "AVGO", "Semikonduktor", 1000],
  ["Tesla", "TSLA", "Otomotif", 900],
  ["JPMorgan", "JPM", "Finansial", 700],
  ["Visa", "V", "Finansial", 560],
  ["UnitedHealth", "UNH", "Kesehatan", 520],
  ["Exxon Mobil", "XOM", "Energi", 480],
  ["Costco", "COST", "Konsumer", 420],
  ["Netflix", "NFLX", "Komunikasi", 400],
  ["Salesforce", "CRM", "Software", 280],
  ["AMD", "AMD", "Semikonduktor", 260],
];

const AI_TECH: Def[] = [
  ["NVIDIA", "NVDA", "Infrastruktur AI", 3000],
  ["Microsoft", "MSFT", "Platform AI", 3300],
  ["Alphabet", "GOOGL", "Riset AI", 2100],
  ["Amazon", "AMZN", "Cloud AI", 2200],
  ["Meta", "META", "Model terbuka", 1500],
  ["Broadcom", "AVGO", "Networking AI", 1000],
  ["TSMC", "TSM", "Foundry", 900],
  ["Oracle", "ORCL", "Cloud AI", 450],
  ["ASML", "ASML", "Litografi", 380],
  ["Palantir", "PLTR", "Analitik AI", 280],
  ["AMD", "AMD", "Akselerator AI", 260],
  ["ServiceNow", "NOW", "AI Enterprise", 200],
  ["Arm", "ARM", "Silikon AI", 150],
  ["Intel", "INTC", "Foundry", 110],
  ["Supermicro", "SMCI", "Server AI", 60],
  ["Snowflake", "SNOW", "Data Cloud", 60],
];

const COMMODITIES: Def[] = [
  ["Emas", "XAU", "Hard Assets", 17000],
  ["Brent Crude", "BRN", "Energi", 2400],
  ["Perak", "XAG", "Metals", 1900],
  ["Tembaga", "HG", "Metals", 1100],
  ["Natural Gas", "NG", "Energi", 800],
  ["Iron Ore", "TIO", "Metals", 600],
  ["Jagung", "ZC", "Agriculture", 300],
  ["Gandum", "ZW", "Agriculture", 130],
  ["Platinum", "XPT", "Metals", 110],
  ["Lithium", "LIT", "Metals", 90],
];

function buildRows(defs: Def[], salt: string): MarketRow[] {
  return defs.map(([name, ticker, category, capB]) => {
    const rnd = mulberry32(hashSeed(`${salt}:${ticker}`));
    const m30 = round(range(rnd, -14, 26), 1);
    const sentiment = round(range(rnd, -0.5, 0.8), 2);
    const heat = round(rnd(), 2);
    const score = round(0.5 * Math.max(-1, Math.min(1, m30 / 20)) + 0.3 * sentiment + 0.2 * heat, 2);
    return {
      slug: `${salt}-${ticker.toLowerCase()}`,
      name,
      ticker,
      category,
      valueUsd: capB * 1e9,
      vol: round(capB * 1e9 * range(rnd, 0.004, 0.02)),
      m30,
      sentiment,
      score,
    };
  });
}

const CACHE: Partial<Record<MarketId, MarketRow[]>> = {};

export function marketRows(market: MarketId): MarketRow[] {
  if (market === "crypto") return [];
  if (!CACHE[market]) {
    CACHE[market] =
      market === "stocks" ? buildRows(STOCKS, "st") : market === "ai" ? buildRows(AI_TECH, "ai") : buildRows(COMMODITIES, "cm");
  }
  return CACHE[market]!;
}
