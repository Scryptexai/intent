import { getStore } from "@/lib/store";
import { binancePerp } from "@/services/market/gateway";
import { patternActivations } from "@/services/vectors";

/**
 * ── Edge Radar ──────────────────────────────────────────────────────────────
 * Structural divergences the advance-retail persona acts on. Internal-first
 * ($0); external perp data (Binance) enriches when reachable.
 */

export interface RadarItem {
  id: string;
  kind: "tvl_sentiment_div" | "volume_rotation" | "unlock_vs_momentum" | "funding_div" | "whale_tape";
  projectSlug: string;
  projectName: string;
  title: string;
  detail: string;
  severity: number; // 0..1
  sources: string[];
  asOf: string;
}

function last7(p: { series: { tvl: number; volume: number; sentiment: number }[] }) {
  const s = p.series;
  const a = s[s.length - 8] ?? s[0];
  const b = s[s.length - 1];
  return { tvl: b.tvl / Math.max(1, a.tvl) - 1, vol: b.volume / Math.max(1, a.volume) - 1, sent: b.sentiment - a.sentiment };
}
function mom30(p: { series: { tvl: number }[] }) {
  const s = p.series;
  return s[s.length - 1].tvl / Math.max(1, s[0].tvl) - 1;
}

export async function computeRadar(): Promise<RadarItem[]> {
  const s = getStore();
  const items: RadarItem[] = [];
  const asOf = new Date().toISOString();
  const universe = s.projects.filter((p) => p.hero || p.isDemo);

  for (const p of universe) {
    const d7 = last7(p);
    const m30 = mom30(p);
    const acts = patternActivations(s, p);
    const unlockIdx = s.patterns.findIndex((x) => x.slug === "unlock-overhang");

    if (d7.tvl > 0.03 && d7.sent < -0.04) {
      items.push({
        id: `div-${p.slug}`, kind: "tvl_sentiment_div", projectSlug: p.slug, projectName: p.name,
        title: `${p.name}: uang masuk, crowd keluar`,
        detail: `TVL 7d +${(d7.tvl * 100).toFixed(1)}% sementara sentiment ${d7.sent.toFixed(2)} — akumulasi saat narasi dingin.`,
        severity: Math.min(1, d7.tvl * 8), sources: ["internal"], asOf,
      });
    }
    if (d7.vol > 0.4 && d7.tvl < 0.02) {
      items.push({
        id: `rot-${p.slug}`, kind: "volume_rotation", projectSlug: p.slug, projectName: p.name,
        title: `${p.name}: rotasi/trading, bukan deposit`,
        detail: `Volume 7d +${(d7.vol * 100).toFixed(0)}% dengan TVL flat — aktivitas spekulatif tanpa modal baru.`,
        severity: Math.min(1, d7.vol / 2), sources: ["internal"], asOf,
      });
    }
    if (unlockIdx >= 0 && acts[unlockIdx] >= 0.4 && m30 > 0.03) {
      items.push({
        id: `unl-${p.slug}`, kind: "unlock_vs_momentum", projectSlug: p.slug, projectName: p.name,
        title: `${p.name}: momentum menabrak supply`,
        detail: `Pattern unlock-overhang aktif (${(acts[unlockIdx] * 100).toFixed(0)}%) di atas momentum 30d +${(m30 * 100).toFixed(1)}% — projected sell-pressure vs harga.`,
        severity: acts[unlockIdx], sources: ["internal", "defillama-unlocks"], asOf,
      });
    }
    const whale = s.signals.find((x) => x.projectId === p.id && x.type === "whale_accumulation");
    if (whale) {
      items.push({
        id: `whl-${p.slug}`, kind: "whale_tape", projectSlug: p.slug, projectName: p.name,
        title: `${p.name}: whale tape aktif`,
        detail: String((whale.payload as { note?: string })?.note ?? "Top-wallet share naik saat harga flat."),
        severity: whale.strength, sources: ["internal", "etherscan"], asOf,
      });
    }

    // External enrichment: funding-vs-price (Binance public, no key)
    if (p.tokenSymbol) {
      const perp = await binancePerp(`${p.tokenSymbol}USDT`);
      if (perp && Math.abs(perp.funding) > 0.0005) {
        const priceDir = d7.sent >= 0 ? 1 : -1;
        const fundDir = perp.funding > 0 ? 1 : -1;
        if (priceDir !== fundDir) {
          items.push({
            id: `fnd-${p.slug}`, kind: "funding_div", projectSlug: p.slug, projectName: p.name,
            title: `${p.name}: funding vs momentum berlawanan`,
            detail: `Funding ${(perp.funding * 100).toFixed(4)}% vs arah sentimen 7d ${priceDir > 0 ? "naik" : "turun"} — posisi crowding melawan harga.`,
            severity: Math.min(1, Math.abs(perp.funding) * 1500), sources: ["binance"], asOf,
          });
        }
      }
    }
  }
  return items.sort((a, b) => b.severity - a.severity);
}
