"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bitcoin, Cpu, Download, Eye, EyeOff, Gem, Globe, Landmark, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { emitUnauthorized } from "@/hooks/use-session";
import { usePlan } from "@/components/shell/plan-context";
import { QueryState } from "@/components/ui/query-state";
import { fmtPct, fmtUsd, cn } from "@/lib/utils";
import { MARKETS, atLeast, type MarketId } from "@/lib/domain";
import { CrossSellBanner, PageBanner } from "@/components/shell/promo-surfaces";
import { useI18n } from "@/lib/i18n";

interface Row {
  slug: string; name: string; ticker?: string; category: string; tvl: number; vol: number; m30: number; sentiment: number; score: number; watched: boolean;
}

const MARKET_ICON: Record<MarketId, React.ComponentType<{ className?: string }>> = {
  crypto: Bitcoin,
  stocks: Landmark,
  ai: Cpu,
  commodities: Gem,
};

const VALUE_HEADER: Record<MarketId, string> = {
  crypto: "TVL",
  stocks: "Kap. pasar",
  ai: "Kap. pasar",
  commodities: "Nilai pasar",
};

/** Universe: ranking sortable + watchlist + CSV, kini multi-market (Ultimate). */
export function UniverseClient() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const router = useRouter();
  const { plan } = usePlan();
  const { t } = useI18n();
  const isUltimate = atLeast(plan, "ultimate");

  const [market, setMarket] = useState<MarketId>("crypto");
  const [sort, setSort] = useState("score");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(25); // pagination — ringan utk ribuan row

  const marketLocked = market !== "crypto" && !isUltimate;

  const data = useQuery<{ rows: Row[]; total: number }>({
    queryKey: ["universe", market, sort, q, limit],
    enabled: !marketLocked,
    queryFn: async () => {
      const res = await fetch(`/api/universe?market=${market}&sort=${sort}&q=${encodeURIComponent(q)}&limit=${limit}`);
      if (res.status === 403) return { rows: [] };
      return res.json();
    },
  });

  async function watch(slug: string) {
    const res = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: `p-${slug}` }) });
    if (res.status === 401) return emitUnauthorized();
    qc.invalidateQueries({ queryKey: ["universe"] });
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "watch", meta: { slug } }) }).catch(() => {});
  }

  async function exportCsv() {
    const all = await fetch(`/api/universe?market=${market}&sort=${sort}&q=${encodeURIComponent(q)}&limit=500`).then((r) => r.json()).catch(() => null);
    const rows = (all?.rows ?? data.data?.rows ?? []) as Row[];
    const csv = ["slug,name,category,value,momentum30d,score", ...rows.map((r) => `${r.slug},${r.name},${r.category},${r.tvl},${r.m30},${r.score}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `intent-universe-${market}.csv`;
    a.click();
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "export", meta: { kind: "csv", market } }) }).catch(() => {});
  }

  return (
    <div className="grid-bg p-4 lg:p-8">
      <PageBanner img="/media/page-universe.png" alt="INTENT — Rank What Matters." />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight"><Globe className="h-6 w-6 text-intent-teal" /> Universe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {market === "crypto" ? t("universe.sub.crypto") : t("universe.sub.other")}
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("universe.filter")} className="w-40" />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">{t("universe.sort.score")}</SelectItem>
              <SelectItem value="momentum">{t("universe.sort.momentum")}</SelectItem>
              <SelectItem value="tvl">{t("universe.sort.value")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}><Download /> CSV</Button>
        </div>
      </div>

      {/* ── selector market ── */}
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Pilih market">
        {MARKETS.map((m) => {
          const Icon = MARKET_ICON[m.id];
          const locked = m.ultimate && !isUltimate;
          const active = market === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMarket(m.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-all",
                active
                  ? "border-intent-gold/60 bg-intent-gold/10 text-foreground"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-intent-gold" : "text-muted-foreground")} />
              {m.label}
              {locked && <Lock className="h-3 w-3 text-intent-gold" />}
            </button>
          );
        })}
        {!isUltimate && (
          <button
            type="button"
            onClick={() => router.push("/upgrade")}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-intent-gold transition-colors hover:text-amber-300"
          >
            {t("universe.open.ultimate")} <Gem className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── konten ── */}
      {marketLocked ? (
        <div className="panel mt-6 flex flex-col items-center px-6 py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-intent-gold/40 bg-intent-gold/10">
            <Lock className="h-5 w-5 text-intent-gold" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{t("universe.locked.title")}</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">{t("universe.locked.body")}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-intent-gold">{t("universe.locked.price")}</span>
          </p>
          <Button className="mt-5 rounded-full" onClick={() => router.push("/upgrade")}>
            {t("universe.locked.cta")}
          </Button>
        </div>
      ) : data.isError ? (
        <div className="mt-6"><QueryState isError retry={() => data.refetch()} /></div>
      ) : !data.isLoading && (data.data?.rows ?? []).length === 0 ? (
        <div className="mt-6"><QueryState isEmpty emptyLabel="Tidak ada instrumen yang cocok dengan filter." /></div>
      ) : data.isLoading ? (
        <div className="mt-6 space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : isMobile ? (
        <div className="mt-6 space-y-2">
          {(data.data?.rows ?? []).map((r) => (
            <div key={r.slug} className="panel panel-hover flex items-center justify-between p-3">
              <Link href={market === "crypto" ? `/brief/${r.slug}` : "#"} className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {r.name} {r.ticker && <span className="mono text-[10px] text-muted-foreground">{r.ticker}</span>} {r.watched && <Eye className="h-3.5 w-3.5 text-intent-teal" />}
                </div>
                <div className="mono mt-0.5 text-[10px] text-muted-foreground">{r.category} · {fmtUsd(r.tvl)} · <span className={r.m30 >= 0 ? "text-intent-lime" : "text-intent-rose"}>{fmtPct(r.m30)}</span></div>
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="amber">{r.score.toFixed(2)}</Badge>
                {market === "crypto" && (
                  <Button size="sm" variant="outline" onClick={() => watch(r.slug)} aria-label="watch">{r.watched ? <EyeOff /> : <Eye />}</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">{market === "crypto" ? "Project" : "Instrumen"}</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">{VALUE_HEADER[market]}</th>
                <th className="px-4 py-3 text-right">Momentum 30d</th>
                <th className="px-4 py-3 text-right">Sentiment</th>
                <th className="px-4 py-3 text-right">Score</th>
                {market === "crypto" && <th className="px-4 py-3 text-right">Watch</th>}
              </tr>
            </thead>
            <tbody>
              {(data.data?.rows ?? []).map((r) => (
                <tr key={r.slug} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5">
                    {market === "crypto" ? (
                      <Link href={`/brief/${r.slug}`} className="font-semibold hover:text-intent-teal">{r.name}</Link>
                    ) : (
                      <span className="font-semibold">{r.name}</span>
                    )}
                    {r.ticker && <span className="mono ml-2 text-[10px] text-muted-foreground">{r.ticker}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.category}</td>
                  <td className="data-num px-4 py-2.5 text-right">{fmtUsd(r.tvl)}</td>
                  <td className={`data-num px-4 py-2.5 text-right ${r.m30 >= 0 ? "text-intent-lime" : "text-intent-rose"}`}>{fmtPct(r.m30)}</td>
                  <td className="data-num px-4 py-2.5 text-right">{r.sentiment.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right"><Badge variant="amber">{r.score.toFixed(2)}</Badge></td>
                  {market === "crypto" && (
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => watch(r.slug)} aria-label={`watch ${r.name}`}>{r.watched ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination footer */}
      {!marketLocked && (data.data?.rows ?? []).length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="mono text-[11px] text-muted-foreground">
            {(data.data?.rows ?? []).length} / {data.data?.total ?? (data.data?.rows ?? []).length}
          </span>
          {(data.data?.rows ?? []).length < (data.data?.total ?? 0) && (
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 50)}>
              {t("common.loadmore")}
            </Button>
          )}
        </div>
      )}

      {!isUltimate && <CrossSellBanner variant="ultimate" />}
    </div>
  );
}
