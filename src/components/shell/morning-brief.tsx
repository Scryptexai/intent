"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Radar, ArrowUpRight, Activity, Waves, Anchor, CalendarClock, Fish, TrendingUp, Eye, Crown, Flame, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";
import { fmtPct, fmtUsd } from "@/lib/utils";
import { HomeHeroCarousel } from "@/components/shell/promo-surfaces";

interface RadarItem {
  id: string;
  kind: string;
  projectSlug: string;
  projectName: string;
  title: string;
  detail: string;
  severity: number;
  sources: string[];
}
interface BriefData {
  radar: RadarItem[];
  watchedAlerts: { id: string; metric: string; anomalyScore: number; direction: string; projectName: string }[];
  movers: { slug: string; name: string; m30: number }[];
  calibration: { id: string; statement: string; outcome: string }[];
  stats: { universeTvl: number; activeAlerts: number; calibrationScore: number | null; projects: number };
  unlocks: { slug: string; name: string; severity: number }[];
  patternHeat: { name: string; active: number }[];
  funding: { symbol: string; funding: number; mark: number }[];
  todaysPick: { slug: string; name: string; score: number; m30: number; tvl: number; category: string } | null;
  asOf: string;
}

const KIND_ICON: Record<string, typeof Radar> = {
  tvl_sentiment_div: Activity,
  volume_rotation: Waves,
  unlock_vs_momentum: CalendarClock,
  funding_div: Anchor,
  whale_tape: Fish,
};

/** Home = Morning Brief: dense, daily, actionable (niche: retail advance bermodal). */
export function MorningBrief() {
  const { fmtDate, t } = useI18n();
  const q = useQuery<BriefData>({
    queryKey: ["morning-brief"],
    staleTime: 5 * 60_000,
    queryFn: () => fetch("/api/radar").then((r) => r.json()),
  });
  const d = q.data;

  return (
    <div className="grid-bg p-4 lg:p-8">
      <HomeHeroCarousel />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{fmtDate(new Date().toISOString())} · as-of {d?.asOf?.slice(11, 16) ?? "…"}</div>
          <h1 className="gradient-text mt-1 text-3xl font-extrabold tracking-tight">Morning Brief</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("brief.sub")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/universe"><Button variant="outline">Universe</Button></Link>
          <Link href="/studio"><Button>Studio</Button></Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {q.isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px]" />)
          : [
              { l: "Universe TVL", v: fmtUsd(d?.stats.universeTvl ?? 0), s: `${d?.stats.projects ?? 0} proyek terpantau` },
              { l: "Active exceptions", v: String(d?.stats.activeAlerts ?? 0), s: "ambang ±2σ · lihat Sentinel Ops" },
              { l: "Calibration score", v: d?.stats.calibrationScore != null ? `${d.stats.calibrationScore}%` : "—", s: "pass / resolved (publik)" },
              { l: "Funding feeds", v: String(d?.funding.length ?? 0), s: d?.funding.length ? "Binance public live" : "internal proxy (offline)" },
            ].map((k) => (
              <Card key={k.l} className="panel-hover">
                <CardContent className="p-4">
                  <div className="eyebrow">{k.l}</div>
                  <div className="data-num mt-1 text-2xl font-extrabold">{k.v}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{k.s}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* Edge Radar */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Radar className="h-4 w-4 text-intent-gold" /> Edge Radar</CardTitle>
            <CardDescription>Funding-vs-price · OI · unlock-vs-momentum · TVL-vs-sentiment · whale tape</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {q.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            {d?.radar.slice(0, 7).map((r) => {
              const Icon = KIND_ICON[r.kind] ?? Radar;
              return (
                <Link key={r.id} href={`/brief/${r.projectSlug}`} className="panel panel-hover block p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-intent-gold" /> {r.title}
                    </span>
                    <span className="mono text-[10px] text-muted-foreground">{r.sources.join(" · ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gradient-to-r from-intent-teal to-intent-gold" style={{ width: `${r.severity * 100}%` }} />
                  </div>
                </Link>
              );
            })}
            {d && d.radar.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tenang — tidak ada divergensi signifikan hari ini.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Today's Pick */}
          <Card className="border-intent-gold/30 bg-gradient-to-br from-intent-gold/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Crown className="h-4 w-4 text-intent-gold" /> Today&apos;s Pick</CardTitle>
              <CardDescription>System-assigned, gratis untuk semua tier</CardDescription>
            </CardHeader>
            <CardContent>
              {d?.todaysPick && (
                <>
                  <Link href={`/brief/${d.todaysPick.slug}`} className="text-lg font-extrabold hover:text-intent-gold">{d.todaysPick.name}</Link>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="amber">score {d.todaysPick.score.toFixed(2)}</Badge>
                    <Badge variant={d.todaysPick.m30 >= 0 ? "success" : "danger"}>{fmtPct(d.todaysPick.m30)} 30d</Badge>
                    <Badge variant="muted">{fmtUsd(d.todaysPick.tvl)}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{d.todaysPick.category} — brief penuh satu klik, termasuk sitasi.</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Watched */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Eye className="h-4 w-4 text-intent-teal" /> Watchlist Anda — berubah semalam</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {q.isLoading && <Skeleton className="h-20" />}
              {d?.watchedAlerts.map((a) => (
                <Link key={a.id} href="/sentinel" className="flex items-center justify-between rounded-md bg-white/5 p-2.5 text-xs hover:bg-white/10">
                  <span className="font-medium">{a.projectName} · {a.metric}</span>
                  <span className="mono font-bold" style={{ color: a.direction === "up" ? "#A3E635" : "#FB7185" }}>{a.anomalyScore.toFixed(2)}σ</span>
                </Link>
              ))}
              {d && d.watchedAlerts.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada anomali pada watchlist Anda. Tandai proyek via Universe.</p>
              )}
            </CardContent>
          </Card>

          {/* Unlocks */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-intent-rose" /> Unlock overhang radar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {d?.unlocks.map((u) => (
                <Link key={u.slug} href={`/brief/${u.slug}`} className="flex items-center justify-between rounded-md bg-white/5 p-2.5 text-xs hover:bg-white/10">
                  <span>{u.name}</span>
                  <span className="mono text-intent-rose">{(u.severity * 100).toFixed(0)}%</span>
                </Link>
              ))}
              {d && d.unlocks.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada overhang aktif.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: movers + funding + pattern heat + calibration */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-intent-lime" /> Movers 30d</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {d?.movers.map((m) => (
              <Link key={m.slug} href={`/brief/${m.slug}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-white/5">
                <span>{m.name}</span>
                <span className={m.m30 >= 0 ? "mono text-intent-lime" : "mono text-intent-rose"}>{fmtPct(m.m30)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Anchor className="h-4 w-4 text-intent-teal" /> Funding tape (perps)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(d?.funding ?? []).length === 0 && <p className="text-xs text-muted-foreground">Feed eksternal offline di sandbox — aktif otomatis di produksi (Binance public, $0).</p>}
            {d?.funding.map((f) => (
              <div key={f.symbol} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
                <span className="mono">{f.symbol}</span>
                <span className={`mono ${f.funding >= 0 ? "text-intent-lime" : "text-intent-rose"}`}>{(f.funding * 100).toFixed(4)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Flame className="h-4 w-4 text-intent-gold" /> Pattern heat (universe)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {d?.patternHeat.map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-intent-gold" style={{ width: `${Math.min(100, p.active * 25)}%` }} />
                  </div>
                  <span className="mono w-4 text-right text-muted-foreground">{p.active}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Gauge className="h-4 w-4 text-intent-lime" /> Kalibrasi terbaru</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d?.calibration.map((c) => (
              <div key={c.id} className="rounded-md bg-white/5 p-2.5 text-xs">
                <Badge variant={c.outcome === "pass" ? "success" : c.outcome === "pending" ? "default" : "muted"}>{c.outcome}</Badge>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{c.statement}</p>
              </div>
            ))}
            <Link href="/track-record" className="inline-flex items-center gap-1 text-xs text-intent-teal hover:underline">
              Track record publik <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
