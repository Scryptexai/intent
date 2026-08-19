"use client";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QueryState } from "@/components/ui/query-state";
import { fmtUsd } from "@/lib/utils";

interface Overview {
  project: { name: string; category: string; tvlUsd: number; volume24hUsd: number; sentiment: number; tvl30dPct: number; slug: string };
  metrics: { tvl: number; volume24h: number; momentum30d: number; sentiment: number; coverage: number };
  intelBrief: { oneLiner: string; threeKeyFacts: string[]; verdict: string; confidence: string };
  cifScore: number;
  knowledge: { total: number };
}

/** P1 Project Overview — Intel Brief (value translation) DI ATAS metrics row. */
export function ProjectOverview({ slug }: { slug: string }) {
  const q = useQuery<Overview>({
    queryKey: ["project", slug],
    staleTime: 5 * 60_000,
    retry: 2,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${slug}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const d = q.data;
  return (
    <div className="space-y-4">
      <QueryState isLoading={q.isLoading} isError={q.isError} isEmpty={!d} retry={() => q.refetch()} emptyLabel="Project tidak ditemukan di universe." />

      {d && (
        <>
          {/* Intel Brief — insight dulu, angka kemudian */}
          <Card className="border-intent-gold/30 bg-gradient-to-br from-intent-gold/10 to-transparent">
            <CardContent className="p-5">
              <div className="eyebrow flex items-center gap-1.5 text-intent-gold">
                <Sparkles className="h-3.5 w-3.5" /> Intel Brief
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed">{d.intelBrief.oneLiner}</p>
              <ul className="mt-3 space-y-1.5">
                {d.intelBrief.threeKeyFacts.map((f) => (
                  <p key={f} className="mono text-[11px] text-muted-foreground">▪ {f}</p>
                ))}
              </ul>
              <p className="mt-3 border-l-2 border-intent-gold pl-3 text-xs leading-relaxed text-foreground/90">{d.intelBrief.verdict}</p>
              <p className="mt-2 text-[10px] text-intent-muted">{d.intelBrief.confidence}</p>
            </CardContent>
          </Card>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              { l: "Intent Score", v: String(d.cifScore), s: "/100" },
              { l: "Coverage", v: `${d.metrics.coverage}%`, s: "dossier" },
              { l: "TVL", v: fmtUsd(d.metrics.tvl), s: "30d " + (d.metrics.momentum30d >= 0 ? "+" : "") + d.metrics.momentum30d + "%" },
              { l: "Volume 24h", v: fmtUsd(d.metrics.volume24h), s: "" },
              { l: "Sentiment", v: d.metrics.sentiment.toFixed(2), s: d.metrics.sentiment >= 0 ? "positive" : "negative" },
              { l: "Knowledge", v: String(d.knowledge.total), s: "items" },
            ].map((m) => (
              <Card key={m.l} className="panel-hover">
                <CardContent className="p-3.5">
                  <div className="eyebrow flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> {m.l}
                  </div>
                  <div className="data-num mt-1 text-xl font-extrabold">{m.v}</div>
                  {m.s && <div className="text-[10px] text-intent-muted">{m.s}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
