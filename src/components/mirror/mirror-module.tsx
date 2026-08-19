"use client";
import { useEffect, useMemo } from "react";
import { PageBanner } from "@/components/shell/promo-surfaces";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ScanSearch, Sparkles, ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/primitives";
import { EChart } from "@/components/charts/echart";
import { fmtPct } from "@/lib/utils";
import { useMirrorStore } from "@/stores/mirror";
import { usePlan } from "@/components/shell/plan-context";
import { useCifLive } from "@/hooks/use-cif-live";
import { QueryState } from "@/components/ui/query-state";
import type { MirrorResult } from "@/services/similarity-engine";

interface Props {
  heroProjects: { id: string; name: string; slug: string; category: string }[];
  initialProjectId: string;
  initialMirror: MirrorResult;
  initialProximity: MirrorResult;
}

export function MirrorModule({ heroProjects, initialProjectId, initialMirror, initialProximity }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { plan } = usePlan();
  const targetProjectId = useMirrorStore((s) => s.targetProjectId);
  const setTarget = useMirrorStore((s) => s.setTarget);

  useEffect(() => {
    if (initialProjectId !== targetProjectId) setTarget(initialProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  const { data, isLoading, isError, refetch, error } = useQuery<MirrorResult>({
    queryKey: ["mirror", targetProjectId],
    initialData: targetProjectId === initialProjectId ? initialMirror : undefined,
    queryFn: async () => {
      const res = await fetch(`/api/mirror?projectId=${encodeURIComponent(targetProjectId)}&topN=3`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Mirror failed");
      return res.json();
    },
  });

  const proximity = useQuery<MirrorResult>({
    queryKey: ["mirror-proximity", targetProjectId],
    initialData: targetProjectId === initialProjectId ? initialProximity : undefined,
    queryFn: async () => {
      const res = await fetch(`/api/mirror?projectId=${encodeURIComponent(targetProjectId)}&topN=28`);
      return res.json();
    },
  });

  const scatterData = useMemo(() => {
    const prox = (proximity.data as MirrorResult | undefined)?.analogs ?? [];
    return prox.map((a) => ({ id: a.project.id, name: a.project.name, similarity: a.similarity, slug: a.project.slug, locked: plan === "free" && !a.project.isDemo }));
  }, [proximity.data, plan]);

  const scatterOption = {
    animation: false,
    grid: { left: 42, right: 16, top: 18, bottom: 30 },
    tooltip: {
      backgroundColor: "#1c2129",
      borderColor: "#2d333b",
      textStyle: { color: "#e6edf3", fontSize: 11 },
      formatter: (p: { data: [number, number, string] }) => `${p.data[2]}<br/>similarity ${(p.data[0] * 100).toFixed(1)}%`,
    },
    xAxis: {
      type: "value",
      name: "cosine similarity",
      nameTextStyle: { color: "#8b949e", fontSize: 10 },
      min: (v: { min: number }) => Math.max(0, Math.floor((v.min - 0.05) * 20) / 20),
      max: 1,
      axisLine: { lineStyle: { color: "#2d333b" } },
      axisLabel: { color: "#8b949e", fontSize: 10, formatter: (v: number) => `${Math.round(v * 100)}%` },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    yAxis: { type: "value", show: false, min: 0, max: 1 },
    series: [
      {
        type: "scatter",
        symbolSize: (d: [number, number, string]) => 10 + d[0] * 26,
        data: scatterData.map((p, i) => [p.similarity, 0.5 + Math.sin(i * 2.4) * 0.32, p.name] as [number, number, string]),
        itemStyle: {
          color: (d: { data: [number, number, string] }) => (d.data[0] > 0.75 ? "#F59E0B" : d.data[0] > 0.6 ? "#2DD4BF" : "#4b5563"),
          opacity: 0.85,
        },
        label: { show: true, formatter: (d: { data: [number, number, string] }) => (d.data[0] > 0.68 ? d.data[2] : ""), position: "top", color: "#e6edf3", fontSize: 9 },
      },
    ],
  };

  // Combined verdict across the 3 analogs
  const verdict = useMemo(() => {
    if (!data || data.analogs.length === 0) return null;
    type Analog = MirrorResult["analogs"][number];
    const top = data.analogs[0];
    const avg = (fn: (a: Analog) => number) => data.analogs.reduce((s, a) => s + fn(a), 0) / data.analogs.length;
    return { top, tvl: avg((a) => a.projection.tvl30dPct), vol: avg((a) => a.projection.volume30dPct), sent: avg((a) => a.projection.sentiment30d) };
  }, [data]);

  const selected = heroProjects.find((p) => p.id === targetProjectId);

  const cif = useQuery<{ firedPatterns: { id: string; nm: string; confidence: string; instances: number; scope: string; pred: string }[] }>({
    queryKey: ["cif-dossier", selected?.slug],
    retry: false,
    enabled: !!selected,
    queryFn: async () => {
      const res = await fetch(`/api/cif/${encodeURIComponent(selected!.slug)}`);
      if (!res.ok) throw new Error("not in catalog");
      return res.json();
    },
  });

  const live = useCifLive();

  const verdictQ = useQuery<{ verdict: { summary: string; reasoning: string; confidence: string }; radar: { axes: string[]; target: number[]; analog: number[] } }>({
    queryKey: ["mirror-verdict", targetProjectId],
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(`/api/mirror/${encodeURIComponent(targetProjectId)}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  // Registry patterns: prefer LIVE Supabase cif_patterns, fall back to snapshot dossier
  const regPats = useMemo(() => {
    const targetName = selected?.name.toLowerCase() ?? "";
    const livePats = (live.data?.patterns ?? [])
      .filter((p) => (p.analogs ?? []).some((a) => a.toLowerCase() === targetName))
      .map((p) => ({ id: p.id, nm: p.name, confidence: p.confidence ?? "LOW", instances: p.instances ?? 0, scope: p.scope ?? "", pred: p.prediction ?? "" }));
    if (livePats.length) return livePats;
    return cif.data?.firedPatterns ?? [];
  }, [live.data, cif.data, selected]);

  const radarOption = verdictQ.data?.radar
    ? {
        animation: false,
        radar: { indicator: verdictQ.data.radar.axes.map((a) => ({ name: a.split(" ").slice(0, 2).join(" "), max: 1 })), radius: "68%", axisName: { color: "#8B949E", fontSize: 8 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } }, splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "transparent"] } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } } },
        legend: { data: ["target", "top analog"], bottom: 0, textStyle: { color: "#8B949E", fontSize: 9 } },
        series: [
          { type: "radar", data: [
            { value: verdictQ.data.radar.target, name: "target", lineStyle: { color: "#F59E0B" }, itemStyle: { color: "#F59E0B" }, areaStyle: { color: "rgba(245,158,11,0.15)" } },
            { value: verdictQ.data.radar.analog, name: "top analog", lineStyle: { color: "#2DD4BF" }, itemStyle: { color: "#2DD4BF" }, areaStyle: { color: "rgba(45,212,191,0.12)" } },
          ] },
        ],
      }
    : null;

  return (
    <div className="grid-bg p-4 lg:p-8">
      <PageBanner img="/media/page-mirror.png" alt="INTENT — History Rhymes. Find It." />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ScanSearch className="h-6 w-6 text-intent-teal" /> The Mirror
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("mirror.sub.a")} {data?.knowledgeCorpus ?? "1,039"} {t("mirror.sub.b")} {data?.patternCount ?? 16} {t("mirror.sub.c")} {data?.scannedProjects ?? 500} {t("mirror.sub.d")}
          </p>
        </div>
        <div className="w-64">
          <Select
            value={targetProjectId}
            onValueChange={(v) => {
              setTarget(v);
              router.replace(`/mirror?projectId=${v}`);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("mirror.select")} />
            </SelectTrigger>
            <SelectContent>
              {heroProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} <span className="text-xs text-muted-foreground">· {p.category}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Top 3 analog projects</CardTitle>
            <CardDescription>Click a card to open the analog&apos;s deep-dive. Projection = analog&apos;s realized 30d trajectory × similarity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isError && <QueryState isError retry={() => refetch()} />}
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
            {!isLoading && !isError && (data?.analogs ?? []).length === 0 && <QueryState isEmpty emptyLabel="Tidak ada analog dengan similarity memadai." />}
            {data?.analogs.map((a, i) => {
              const locked = plan === "free" && !a.project.isDemo;
              return (
                <button
                  key={a.project.id}
                  onClick={() => router.push(`/project/${a.project.slug}`)}
                  className="panel panel-hover block w-full p-4 text-left"
                  title={locked ? "Pro universe — detail locked" : "Open project deep-dive"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="mono text-xs text-muted-foreground">#{i + 1}</span>
                      <span className="font-semibold">{a.project.name}</span>
                      <Badge variant="muted">{a.project.category}</Badge>
                      {locked && <Lock className="h-3 w-3 text-intent-gold" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-intent-teal to-intent-gold" style={{ width: `${a.similarity * 100}%` }} />
                      </div>
                      <span className="mono text-sm font-bold text-intent-gold">{(a.similarity * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{a.rationale}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.matchedPatterns.slice(0, 2).map((m) => (
                      <Badge key={m.slug} variant="default">
                        {m.name} · {(m.strength * 100).toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                  <div className="mono mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-white/5 p-2">
                      <div className="text-muted-foreground">TVL 30d</div>
                      <div className={a.projection.tvl30dPct >= 0 ? "text-intent-lime" : "text-intent-rose"}>{fmtPct(a.projection.tvl30dPct)}</div>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <div className="text-muted-foreground">Volume 30d</div>
                      <div className={a.projection.volume30dPct >= 0 ? "text-intent-lime" : "text-intent-rose"}>{fmtPct(a.projection.volume30dPct)}</div>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <div className="text-muted-foreground">Sentiment Δ</div>
                      <div className={a.projection.sentiment30d >= 0 ? "text-intent-lime" : "text-intent-rose"}>
                        {a.projection.sentiment30d >= 0 ? "+" : ""}
                        {a.projection.sentiment30d.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pattern proximity map</CardTitle>
              <CardDescription>Universe reflection vs. {selected?.name ?? "target"}</CardDescription>
            </CardHeader>
            <CardContent>{proximity.isLoading ? <Skeleton className="h-[220px]" /> : <EChart option={scatterOption as never} height={220} />}</CardContent>
          </Card>
          {regPats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Registry patterns (locked P-codes)</CardTitle>
                <CardDescription>
                  {live.data?.source === "supabase" ? "LIVE Supabase (bridge service_role)" : "Snapshot cif-export/1"} — confidence = instances (≥3 HIGH · 2 MEDIUM · 1 LOW).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {regPats.map((p) => (
                  <div key={p.id} className="rounded-md bg-white/5 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.id} · {p.nm}</span>
                      <Badge variant={p.confidence === "HIGH" ? "success" : p.confidence === "MEDIUM" ? "amber" : "muted"}>{p.confidence} · {p.instances}×</Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">scope: {p.scope}</p>
                    {p.instances === 1 && (
                      <p className="mt-1 text-[10px] text-intent-gold">⚠ single-instance — weakly transferable until a second unrelated project confirms the shape (§3.2).</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {radarOption && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pattern radar — 16 axes</CardTitle>
                <CardDescription>Target vs top analog overlay</CardDescription>
              </CardHeader>
              <CardContent><EChart option={radarOption as never} height={240} /></CardContent>
            </Card>
          )}
          <Card className="border-intent-teal/30 bg-intent-teal/5">
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-intent-teal">
                <Sparkles className="h-4 w-4" /> Mirror verdict
              </div>
              {verdictQ.data && (
                <p className="mb-2 text-xs leading-relaxed text-foreground/90">
                  {verdictQ.data.verdict.summary}{" "}
                  <span className="text-intent-muted">{verdictQ.data.verdict.reasoning}</span>{" "}
                  <Badge variant={verdictQ.data.verdict.confidence === "High" ? "success" : verdictQ.data.verdict.confidence === "Medium" ? "amber" : "muted"}>Confidence: {verdictQ.data.verdict.confidence}</Badge>
                </p>
              )}
              {verdict ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">{data!.target.name}</strong> most closely mirrors{" "}
                  <button className="text-intent-teal hover:underline" onClick={() => router.push(`/project/${verdict.top.project.slug}`)}>
                    {verdict.top.project.name}
                  </button>{" "}
                  ({(verdict.top.similarity * 100).toFixed(1)}%). Blending all three analogs&apos; realized trajectories, the composite transfer projects{" "}
                  <strong className={verdict.tvl >= 0 ? "text-intent-lime" : "text-intent-rose"}>{fmtPct(verdict.tvl)} TVL</strong>,{" "}
                  <strong className={verdict.vol >= 0 ? "text-intent-lime" : "text-intent-rose"}>{fmtPct(verdict.vol)} volume</strong> and{" "}
                  <strong className={verdict.sent >= 0 ? "text-intent-lime" : "text-intent-rose"}>
                    {verdict.sent >= 0 ? "+" : ""}
                    {verdict.sent.toFixed(2)} sentiment
                  </strong>{" "}
                  over 30 days.
                  <button onClick={() => router.push(`/studio?sourceType=pattern&sourceId=${verdict.top.matchedPatterns[0]?.slug ?? ""}`)} className="mt-2 flex items-center gap-1 text-intent-teal hover:underline">
                    Write this up in Content Studio <ArrowRight className="h-3 w-3" />
                  </button>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{isLoading ? "Reflecting…" : "Select a project."}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
