"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Radar, RefreshCw, Eye, EyeOff, TrendingUp, TrendingDown, ScanSearch, PenSquare, CheckCheck, X, BellRing, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { EChart } from "@/components/charts/echart";
import { cn, fmtUsd, timeAgo } from "@/lib/utils";
import type { MetricPoint } from "@/lib/domain";
import { useSentinelStore } from "@/stores/sentinel";
import { useCifLive } from "@/hooks/use-cif-live";
import { QueryState } from "@/components/ui/query-state";
import { emitUnauthorized } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Anomaly {
  id: string;
  projectId: string;
  metric: "tvl" | "volume" | "sentiment";
  anomalyScore: number;
  direction: "up" | "down";
  detail: string;
  resolved: boolean;
  createdAt: string;
  watched: boolean;
  projectName: string;
  projectSlug: string;
  category: string;
}

interface AnomalyDetail {
  alert: Anomaly;
  project: { id: string; name: string; slug: string; category: string; description: string };
  series: MetricPoint[];
  deviation: { windowMean: number; windowStd: number; last: number; z: number };
  similarPatternAt: { name: string; slug: string; similarity: number } | null;
  relatedKnowledge: { statement: string; source: string; confidence: number }[];
}

const METRIC_COLOR: Record<string, string> = { tvl: "#2DD4BF", volume: "#F59E0B", sentiment: "#2DD4BF" };

function fmtVal(v: number, metric: string) {
  if (metric === "sentiment") return v.toFixed(2);
  return fmtUsd(v);
}

function Sparkline({ series, metric, up }: { series: MetricPoint[]; metric: string; up: boolean }) {
  const values = series.map((p) => (metric === "sentiment" ? p.sentiment : metric === "tvl" ? p.tvl : p.volume));
  const color = up ? "#A3E635" : "#FB7185";
  return (
    <EChart
      height={56}
      className="w-full"
      option={{
        animation: false,
        grid: { left: 0, right: 0, top: 4, bottom: 0 },
        xAxis: { type: "category", show: false, data: series.map((p) => p.t) },
        yAxis: { type: "value", show: false, scale: true },
        series: [{ type: "line", data: values, showSymbol: false, smooth: true, lineStyle: { width: 1.6, color }, areaStyle: { color: `${color}22` } }],
      }}
    />
  );
}

function DeviationChart({ detail }: { detail: AnomalyDetail }) {
  const { series, deviation, alert } = detail;
  const values = series.map((p) => (alert.metric === "sentiment" ? p.sentiment : alert.metric === "tvl" ? p.tvl : p.volume));
  return (
    <EChart
      height={170}
      option={{
        animation: false,
        grid: { left: 48, right: 12, top: 14, bottom: 22 },
        tooltip: { trigger: "axis", backgroundColor: "#1c2129", borderColor: "#2d333b", textStyle: { color: "#e6edf3", fontSize: 11 } },
        xAxis: { type: "category", data: series.map((p) => p.t), axisLabel: { color: "#8b949e", fontSize: 9, interval: 9 }, axisLine: { lineStyle: { color: "#2d333b" } } },
        yAxis: { type: "value", scale: true, axisLabel: { color: "#8b949e", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } } },
        series: [
          {
            type: "line",
            data: values,
            showSymbol: false,
            smooth: true,
            lineStyle: { width: 1.6, color: "#2DD4BF" },
            areaStyle: { color: "rgba(37,99,235,0.12)" },
            markLine: {
              symbol: "none",
              lineStyle: { color: "#8b949e", type: "dashed" },
              label: { color: "#8b949e", fontSize: 9, formatter: "30d μ" },
              data: [{ yAxis: deviation.windowMean }],
            },
            markPoint: {
              data: [{ name: "now", coord: [series.length - 1, values[values.length - 1]], value: deviation.z.toFixed(1) + "σ", itemStyle: { color: deviation.z > 0 ? "#A3E635" : "#FB7185" }, label: { color: "#fff", fontSize: 9 } }],
            },
          },
        ],
      }}
    />
  );
}

export function SentinelDashboard({
  universeSize,
  watchedCount,
  initialAnomalies,
  initialCif,
}: {
  universeSize: number;
  watchedCount: number;
  initialAnomalies: { anomalies: Anomaly[]; logs: unknown[]; scheduler: { mode: string; lastRun?: string } | null };
  initialCif: { stats: { projects: number; decisionEvents: number; entities: number; knowledge: number; patterns: number; schema: string }; supabase: { configured: boolean; reachable: boolean; url: string | null } };
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const [severity, setSeverity] = useState<"all" | "high" | "medium">("all");
  const selectedId = useSentinelStore((s) => s.selectedAlertId);
  const openDetail = useSentinelStore((s) => s.openDetail);
  const closeDetail = useSentinelStore((s) => s.closeDetail);

  // Real-time: refetch every hour per spec — SSR-hydrated via initialData
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["anomalies", severity],
    initialData: initialAnomalies,
    queryFn: async () => {
      const res = await fetch(`/api/anomalies?unresolved=1&severity=${severity === "all" ? "" : severity}`);
      return res.json() as Promise<{ anomalies: Anomaly[]; logs: unknown[]; scheduler: { mode: string; lastRun?: string } | null }>;
    },
    refetchInterval: 3_600_000,
  });

  const cif = useQuery<{
    stats: { projects: number; decisionEvents: number; entities: number; knowledge: number; patterns: number; schema: string };
    supabase: { configured: boolean; reachable: boolean; url: string | null };
  }>({
    queryKey: ["cif-stats"],
    initialData: initialCif,
    staleTime: 5 * 60_000,
    queryFn: () => fetch("/api/cif").then((r) => r.json()),
  });

  // Live bridge (browser-side) — Supabase read-for-everyone tables
  const live = useCifLive();

  const detail = useQuery<AnomalyDetail>({
    queryKey: ["anomaly-detail", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await fetch(`/api/anomalies/${selectedId}`);
      if (!res.ok) throw new Error("Detail failed");
      return res.json();
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/anomalies/${id}`, { method: "POST" });
      if (res.status === 401) emitUnauthorized();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      closeDetail();
    },
  });

  const watchMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      if (res.status === 401) emitUnauthorized();
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anomalies"] }),
  });

  async function runScan() {
    setBusy(true);
    try {
      await fetch("/api/sentinel/run", { method: "POST" });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
    } finally {
      setBusy(false);
    }
  }

  const active = [...(data?.anomalies ?? [])].sort((a, b) => Number(b.watched) - Number(a.watched) || b.anomalyScore - a.anomalyScore);
  const topScore = active.length ? Math.max(...active.map((a) => a.anomalyScore)) : 0;
  const watchedActive = active.filter((a) => a.watched).length;

  return (
    <div className="grid-bg p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Radar className="h-6 w-6 text-intent-gold" /> {t("sentinel.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("sentinel.sub")}
          </p>
          {cif.data && (
            <p className="mono mt-1.5 text-[10px] text-intent-gold/90">
              {live.data && live.data.source === "supabase" ? (
                <>
                  LIVE Supabase (bridge server-side): {live.data.projects.length} cif_projects · {live.data.patterns.length} patterns ·{" "}
                  {live.data.backtests.length} backtests · {live.data.entities.length} entities · {live.data.evidenceCount} evidence items
                </>
              ) : (
                <>
                  INTENT locked catalog ({cif.data.stats.schema}, snapshot): {cif.data.stats.projects} projects · {cif.data.stats.decisionEvents} decision events ·{" "}
                  {cif.data.stats.entities} entities · {cif.data.stats.knowledge} knowledge · {cif.data.stats.patterns} patterns
                  {cif.data.supabase.configured && !cif.data.supabase.reachable && " · Supabase configured (server egress blocked — browser hydrates live)"}
                </>
              )}
            </p>
          )}
        </div>
        <Button onClick={runScan} disabled={busy}>
          <RefreshCw className={cn(busy && "animate-spin")} /> {busy ? "Scanning…" : "Run scan now"}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[84px]" />)
          : [
              { label: "Active exceptions", value: String(active.length), icon: <Radar className="h-4 w-4 text-intent-rose" /> },
              { label: "Highest anomaly score", value: topScore ? `${topScore.toFixed(2)}σ` : "—", icon: <TrendingUp className="h-4 w-4 text-intent-gold" /> },
              { label: "Watchlist hits", value: String(watchedActive), icon: <Eye className="h-4 w-4 text-intent-teal" /> },
              { label: "Tracked projects", value: String(universeSize), icon: <ScanSearch className="h-4 w-4 text-intent-lime" /> },
            ].map((k) => (
              <Card key={k.label} className="panel-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                    <div className="mono mt-1 text-2xl font-bold">{k.value}</div>
                  </div>
                  {k.icon}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Exception list</CardTitle>
            <CardDescription>Click an exception for the deviation deep-dive. Acknowledge marks it resolved.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(["all", "high", "medium"] as const).map((sv) => (
              <button
                key={sv}
                onClick={() => setSeverity(sv)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${severity === sv ? "bg-intent-gold text-intent-bg font-semibold" : "border border-white/10 text-muted-foreground hover:text-foreground"}`}
              >
                {sv}
              </button>
            ))}
            <Badge variant="muted" className="gap-1.5">
              <CheckCheck className="h-3 w-3" /> {watchedCount} watched
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <QueryState isError retry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : active.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("sentinel.empty")}</div>
          ) : (
            <div className="space-y-3">
              {active.map((a) => {
                const up = a.direction === "up";
                return (
                  <div key={a.id} className="panel panel-hover grid cursor-pointer gap-3 p-4 md:grid-cols-[220px_1fr_160px_150px]" onClick={() => openDetail(a.id)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold hover:text-intent-teal hover:underline">{a.projectName}</span>
                        {a.watched && <Eye className="h-3.5 w-3.5 text-intent-teal" />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {a.category} · <span className="mono uppercase" style={{ color: METRIC_COLOR[a.metric] }}>{a.metric}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {up ? <TrendingUp className="h-3.5 w-3.5 text-intent-lime" /> : <TrendingDown className="h-3.5 w-3.5 text-intent-rose" />}
                        <span className={up ? "text-intent-lime" : "text-intent-rose"}>{up ? "Surge" : "Collapse"}</span>
                        <span className="text-muted-foreground">· {timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className={cn("h-full rounded-full", up ? "bg-intent-lime" : "bg-intent-rose")} style={{ width: `${Math.min(100, (a.anomalyScore / 4) * 100)}%` }} />
                        </div>
                        <span className="mono text-sm font-bold" style={{ color: up ? "#A3E635" : "#FB7185" }}>
                          {a.anomalyScore.toFixed(2)}σ
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                      <p className="mt-1 border-l-2 border-intent-gold/50 pl-2 text-[11px] leading-relaxed text-foreground/80">{(a as { impactTranslation?: string }).impactTranslation}</p>
                    </div>
                    <div className="hidden md:block">
                      {detail.data?.alert.id === a.id ? <DeviationChart detail={detail.data} /> : <SparklineLazy projectId={a.projectId} metric={a.metric} up={up} />}
                    </div>
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" title="Acknowledge exception" onClick={() => ackMutation.mutate(a.id)}>
                        <Check /> Ack
                      </Button>
                      <Link href={`/mirror?projectId=${a.projectId}`}>
                        <Button size="sm" variant="outline" title="Open in The Mirror">
                          <ScanSearch />
                        </Button>
                      </Link>
                      <Link href={`/studio?sourceType=airdrop&sourceId=${a.projectId}`}>
                        <Button size="sm" variant="outline" title="Create content in Studio">
                          <PenSquare />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail side panel ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={closeDetail}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-intent-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {detail.isLoading ? (
              <div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40" /><Skeleton className="h-24" /></div>
            ) : detail.data ? (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold">{detail.data.project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {detail.data.project.category} · <span className="mono uppercase">{detail.data.alert.metric}</span> ·{" "}
                      <span className={detail.data.deviation.z > 0 ? "text-intent-lime" : "text-intent-rose"}>
                        {detail.data.deviation.z > 0 ? "+" : ""}
                        {detail.data.deviation.z.toFixed(2)}σ
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closeDetail}>
                    <X />
                  </Button>
                </div>

                <DeviationChart detail={detail.data} />
                <div className="mono mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-md bg-white/5 p-2"><div className="text-muted-foreground">30d μ</div><div>{fmtVal(detail.data.deviation.windowMean, detail.data.alert.metric)}</div></div>
                  <div className="rounded-md bg-white/5 p-2"><div className="text-muted-foreground">σ</div><div>{detail.data.deviation.windowStd.toFixed(2)}</div></div>
                  <div className="rounded-md bg-white/5 p-2"><div className="text-muted-foreground">last</div><div>{fmtVal(detail.data.deviation.last, detail.data.alert.metric)}</div></div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail.data.alert.detail}</p>

                {detail.data.similarPatternAt && (
                  <div className="mt-4 rounded-md border border-intent-teal/30 bg-intent-teal/5 p-3 text-xs">
                    <div className="mb-1 font-semibold text-intent-teal">Pattern proximity</div>
                    Pola serupa terjadi di{" "}
                    <Link className="text-intent-teal hover:underline" href={`/project/${detail.data.similarPatternAt.slug}`}>
                      {detail.data.similarPatternAt.name}
                    </Link>{" "}
                    (similarity {(detail.data.similarPatternAt.similarity * 100).toFixed(1)}%) — buka Mirror untuk transfer impact.
                  </div>
                )}

                <div className="mt-4">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Knowledge terkait</div>
                  <ul className="space-y-1.5">
                    {detail.data.relatedKnowledge.map((k) => (
                      <li key={k.statement} className="text-xs leading-relaxed text-muted-foreground">
                        <span className="mono mr-1.5 rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase">{k.source}</span>
                        {k.statement}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button className="flex-1" onClick={() => ackMutation.mutate(detail.data!.alert.id)} disabled={ackMutation.isPending}>
                    <Check /> Acknowledge
                  </Button>
                  <Button
                    className="flex-1"
                    variant={detail.data.alert.watched ? "secondary" : "amber"}
                    onClick={() => watchMutation.mutate(detail.data!.project.id)}
                    disabled={watchMutation.isPending}
                  >
                    <BellRing /> {detail.data.alert.watched ? "Watching" : "Create Alert"}
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/project/${detail.data.project.slug}`}>
                    <Button variant="outline" className="w-full"><ScanSearch /> Deep-dive</Button>
                  </Link>
                  <Link href={`/studio?sourceType=airdrop&sourceId=${detail.data.project.id}`}>
                    <Button variant="outline" className="w-full"><PenSquare /> Studio</Button>
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** Sparkline loaded lazily per project for the row list. */
function SparklineLazy({ projectId, metric, up }: { projectId: string; metric: string; up: boolean }) {
  const { data } = useQuery({
    queryKey: ["project-series", projectId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) return null;
      const d = await res.json();
      return (d.series as MetricPoint[]) ?? null;
    },
  });
  if (!data) return <Skeleton className="h-[56px]" />;
  return <Sparkline series={data.slice(-40)} metric={metric} up={up} />;
}
