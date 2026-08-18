"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { Lock, ArrowLeft, Dices, PenSquare, BellPlus, Radar, GitBranch, Fingerprint, BookOpen, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/primitives";
import { EChart } from "@/components/charts/echart";
import { cn, fmtDate, fmtPct, fmtUsd, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/components/shell/plan-context";
import type { ProjectDetail } from "@/services/project-detail";
import type { ChainNode } from "@/services/decision-chain";
import type { MirrorResult } from "@/services/similarity-engine";
import type { CifProjectDossier } from "@/services/cif-loader";
import type { CifDecisionEvent } from "@/lib/cif/types";
import { POVS } from "@/lib/cif/types";
import { Database, ScrollText, ShieldAlert, Printer } from "lucide-react";
import { CitationPanel } from "@/components/ui/citation";
import { ProjectOverview } from "@/components/project/project-overview";

export function ProjectDetailModule({
  slug,
  exists,
  initialDetail,
  initialCif,
}: {
  slug: string;
  exists: boolean;
  initialDetail: ProjectDetail | null;
  initialCif: CifProjectDossier | null;
}) {
  const { t } = useI18n();
  const { plan } = usePlan();

  const detail = useQuery<ProjectDetail>({
    queryKey: ["project-detail", slug],
    enabled: exists,
    initialData: initialDetail ?? undefined,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${slug}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const mirror = useQuery<MirrorResult>({
    queryKey: ["mirror", detail.data?.project.id],
    enabled: !!detail.data?.project.id,
    queryFn: () => fetch(`/api/mirror?projectId=${detail.data!.project.id}`).then((r) => r.json()),
  });

  const cif = useQuery<CifProjectDossier | null>({
    queryKey: ["cif-dossier", slug],
    retry: false,
    initialData: initialCif ?? undefined,
    queryFn: async () => {
      const res = await fetch(`/api/cif/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("not in cif catalog");
      return res.json();
    },
  });
  const [selectedDE, setSelectedDE] = useState<CifDecisionEvent | null>(null);

  const chain = useQuery<{ nodes: ChainNode[]; edges: { id: string; source: string; target: string; probability: number; counterFactual: boolean }[] }>({
    queryKey: ["chain", detail.data?.project.id],
    enabled: !!detail.data?.project.id,
    queryFn: async () => {
      const res = await fetch(`/api/multiverse?projectId=${detail.data!.project.id}`);
      if (!res.ok) return { nodes: [], edges: [] };
      return res.json();
    },
  });

  const d = detail.data;
  const locked = d?.project.locked && plan === "free";

  const chartOption = useMemo(() => {
    if (!d) return null;
    return {
      animation: false,
      grid: { left: 52, right: 12, top: 20, bottom: 24 },
      legend: { textStyle: { color: "#8b949e", fontSize: 10 }, top: 0, right: 0 },
      tooltip: { trigger: "axis", backgroundColor: "#1c2129", borderColor: "#2d333b", textStyle: { color: "#e6edf3", fontSize: 11 } },
      xAxis: { type: "category", data: d.series.map((p) => p.t), axisLabel: { color: "#8b949e", fontSize: 9, interval: 14 }, axisLine: { lineStyle: { color: "#2d333b" } } },
      yAxis: [
        { type: "value", scale: true, axisLabel: { color: "#8b949e", fontSize: 9, formatter: (v: number) => fmtUsd(v) }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } } },
        { type: "value", min: -1, max: 1, axisLabel: { color: "#2DD4BF", fontSize: 9 }, splitLine: { show: false } },
      ],
      series: [
        { name: "TVL", type: "line", data: d.series.map((p) => p.tvl), showSymbol: false, smooth: true, lineStyle: { width: 1.6, color: "#2DD4BF" }, areaStyle: { color: "rgba(37,99,235,0.12)" } },
        { name: "Volume", type: "line", data: d.series.map((p) => p.volume), showSymbol: false, smooth: true, lineStyle: { width: 1.2, color: "#F59E0B" } },
        { name: "Sentiment", type: "line", yAxisIndex: 1, data: d.series.map((p) => p.sentiment), showSymbol: false, smooth: true, lineStyle: { width: 1.2, color: "#2DD4BF" } },
      ],
    };
  }, [d]);

  const flow = useMemo(() => {
    const events = chain.data?.nodes ?? [];
    const depth = new Map<string, number>();
    const roots = events.filter((e) => !e.parentId || !events.some((x) => x.id === e.parentId));
    const queue = roots.map((r) => ({ id: r.id, dpt: 0 }));
    while (queue.length) {
      const { id, dpt } = queue.shift()!;
      if (depth.has(id)) continue;
      depth.set(id, dpt);
      events.filter((e) => e.parentId === id).forEach((c) => queue.push({ id: c.id, dpt: dpt + 1 }));
    }
    const byDepth = new Map<number, string[]>();
    events.forEach((e) => {
      const dd = depth.get(e.id) ?? 0;
      byDepth.set(dd, [...(byDepth.get(dd) ?? []), e.id]);
    });
    const nodes: Node[] = events.map((e) => {
      const dd = depth.get(e.id) ?? 0;
      const sibs = byDepth.get(dd) ?? [e.id];
      const color = e.kind === "decision" ? "#F59E0B" : e.kind === "catalyst" ? "#2DD4BF" : e.impact.tvl >= 0 ? "#A3E635" : "#FB7185";
      return {
        id: e.id,
        position: { x: dd * 240, y: sibs.indexOf(e.id) * 120 - (sibs.length - 1) * 60 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className="rounded-md border-2 bg-[#161B22] px-2 py-1.5 text-center" style={{ borderColor: color, width: 160 }}>
              <div className="mono text-[7px] uppercase tracking-widest" style={{ color }}>{e.kind}</div>
              <div className="text-[9px] leading-tight text-foreground line-clamp-2">{e.title}</div>
            </div>
          ),
        },
      };
    });
    const edges: Edge[] = (chain.data?.edges ?? []).map((e) => ({
      id: e.id, source: e.source, target: e.target, animated: e.counterFactual,
      style: { stroke: e.counterFactual ? "#F59E0B" : "#2DD4BF" },
      label: `${(e.probability * 100).toFixed(0)}%`, labelStyle: { fill: "#8b949e", fontSize: 9 }, labelBgStyle: { fill: "#0B0E11" },
    }));
    return { nodes, edges };
  }, [chain.data]);

  if (!exists) {
    return (
      <div className="grid place-items-center p-20 text-center">
        <div>
          <div className="text-2xl font-bold">Project not found</div>
          <p className="mt-2 text-sm text-muted-foreground">No project with slug “{slug}” in the monitored universe.</p>
          <Link href="/"><Button variant="outline" className="mt-4"><ArrowLeft /> {t("pd.back")}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-bg relative p-4 lg:p-8">
      {detail.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-96" />
        </div>
      )}

      {d && (
        <>
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-intent-teal/15 text-lg font-extrabold text-intent-teal ring-1 ring-inset ring-intent-teal/40">
                {(d.project.tokenSymbol ?? d.project.name).slice(0, 2)}
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {d.project.name}
                  <Badge variant="muted">{d.project.category}</Badge>
                  {d.project.hero && <Badge variant="default">HERO</Badge>}
                  {cif.data && (
                    <Badge variant="amber" className="gap-1" title="Project ada di katalog locked INTENT (cif-export/1)">
                      <Database className="h-3 w-3" /> INTENT · {cif.data.project.tier} · era {cif.data.project.era}
                    </Badge>
                  )}
                </h1>
                <div className="mono mt-1 text-xs text-muted-foreground">
                  launched {fmtDate(d.project.launchDate)} · {d.project.tokenSymbol ?? "no token"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="panel px-4 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Intent Score</div>
                <div className={cn("mono text-xl font-extrabold", d.cifScore >= 60 ? "text-intent-lime" : d.cifScore >= 40 ? "text-intent-gold" : "text-intent-rose")}>{d.cifScore}</div>
              </div>
              <Link href={`/studio?sourceType=airdrop&sourceId=${d.project.id}`}><Button variant="outline"><PenSquare /> Studio</Button></Link>
              <Link href="/edge"><Button variant="outline"><Dices /> The Edge</Button></Link>
              <Link href={`/print/${slug}`} target="_blank"><Button variant="outline" title={t("pd.memoTitle")}><Printer /> Memo</Button></Link>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="multiverse"><GitBranch className="mr-1 h-3.5 w-3.5" /> Multiverse</TabsTrigger>
              <TabsTrigger value="mirror">Mirror</TabsTrigger>
              <TabsTrigger value="origin"><Fingerprint className="mr-1 h-3.5 w-3.5" /> Origin</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="knowledge"><BookOpen className="mr-1 h-3.5 w-3.5" /> Knowledge</TabsTrigger>
              <TabsTrigger value="signals"><Radio className="mr-1 h-3.5 w-3.5" /> Signals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="relative">
              {locked && <LockOverlay />}
              <div className={cn("space-y-4", locked && "pointer-events-none opacity-40 blur-[1px]")}>
                <ProjectOverview slug={slug} />
              </div>
              <div className={cn("mt-4 grid gap-4 lg:grid-cols-3", locked && "pointer-events-none opacity-40 blur-[1px]")}>
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-sm">{t("pd.telemetry")}</CardTitle><CardDescription>TVL · Volume · Sentiment</CardDescription></CardHeader>
                  <CardContent>{chartOption && <EChart option={chartOption as never} height={280} />}</CardContent>
                </Card>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: "TVL", v: fmtUsd(d.project.tvlUsd), s: fmtPct(d.project.tvl30dPct), up: d.project.tvl30dPct >= 0 },
                      { l: "Volume 24h", v: fmtUsd(d.project.volume24hUsd), s: fmtPct(d.project.volume30dPct), up: d.project.volume30dPct >= 0 },
                    ].map((k) => (
                      <Card key={k.l}><CardContent className="p-4">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                        <div className="mono mt-1 text-lg font-bold">{k.v}</div>
                        <div className={cn("mono text-xs", k.up ? "text-intent-lime" : "text-intent-rose")}>{k.s} /30d</div>
                      </CardContent></Card>
                    ))}
                  </div>
                  {d.airdrop && (
                    <Card className="border-intent-gold/30 bg-intent-gold/5">
                      <CardContent className="p-4">
                        <div className="mono text-2xl font-extrabold text-intent-gold">{d.airdrop.sell_pressure_7d_pct}%</div>
                        <div className="text-xs text-muted-foreground">of {d.airdrop.token} recipients sold in 7d · {fmtUsd(d.airdrop.dropped_usd)} dropped · {d.airdrop.claimants.toLocaleString()} claimants</div>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">{t("pd.activePatterns")}</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-1.5">
                      {d.activePatterns.length === 0 && <span className="text-xs text-muted-foreground">No strong pattern activations.</span>}
                      {d.activePatterns.map((p) => <Badge key={p.name} variant="amber">{p.name} · {(p.activation * 100).toFixed(0)}%</Badge>)}
                    </CardContent>
                  </Card>
                </div>
                <Card className="lg:col-span-3">
                  <CardHeader><CardTitle className="text-sm">{t("pd.recentEvents")}</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {d.events.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <Badge variant={e.kind === "decision" ? "default" : e.kind === "catalyst" ? "amber" : "success"}>{e.kind}</Badge>
                        <span className="flex-1 truncate">{e.title}</span>
                        <span className="mono text-muted-foreground">{fmtDate(e.occurredAt)}</span>
                      </div>
                    ))}
                    {d.events.length === 0 && <p className="text-xs text-muted-foreground">No events recorded.</p>}
                  </CardContent>
                </Card>
              </div>

              {/* ── Locked CIF schema sections ── */}
              {cif.data && (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {cif.data.qa && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">{t("pd.intentScore")}</CardTitle>
                        <CardDescription>Kelengkapan dossier kita (bukan kesehatan proyek). {cif.data.qa.total.toFixed(1)}/100</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {cif.data.qa.dimensions.map((dim) => (
                          <div key={dim.key}>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">{dim.label} <span className="mono text-muted-foreground/60">w{dim.weight}</span></span>
                              <span className="mono font-bold">{dim.score.toFixed(0)}</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-white/5">
                              <div className={cn("h-full", dim.score >= 70 ? "bg-intent-lime" : dim.score >= 40 ? "bg-intent-gold" : "bg-intent-rose")} style={{ width: `${dim.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {cif.data.behavior && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">{t("pd.behavioral")}</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Strategic objectives</div>
                        <div className="flex flex-wrap gap-1.5">
                          {cif.data.behavior.strategicObjectives.slice(0, 4).map((o) => <Badge key={o} variant="default">{o.slice(0, 48)}</Badge>)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Decision patterns</div>
                        <div className="flex flex-wrap gap-1.5">
                          {cif.data.behavior.decisionPatterns.slice(0, 6).map((o) => <Badge key={o} variant="muted">{o.slice(0, 48)}</Badge>)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-intent-gold" /> {t("pd.conflicts")}</CardTitle>
                      <CardDescription>{cif.data.conflicts?.length ?? 0} cross-checked source conflicts (Phase 11)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(cif.data.conflicts ?? []).slice(0, 3).map((c) => (
                        <div key={c.id} className="rounded-md bg-white/5 p-2.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{c.title}</span>
                            <Badge variant={c.status === "Resolved" ? "success" : "danger"}>{c.status}</Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground line-clamp-2">{c.description}</p>
                          <div className="mono mt-1 text-[10px] text-muted-foreground">
                            A: {c.versionA.source} {c.versionA.value} · B: {c.versionB.source} {c.versionB.value}
                          </div>
                        </div>
                      ))}
                      {(cif.data.conflicts ?? []).length === 0 && <p className="text-xs text-muted-foreground">No recorded conflicts.</p>}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="multiverse" forceMount className="data-[state=inactive]:hidden">
              {cif.data?.decisionEvents && cif.data.decisionEvents.length > 0 ? (
                <div className="relative">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm"><ScrollText className="h-4 w-4 text-intent-teal" /> Causal dossier — {cif.data.decisionEvents.length} Decision Events ({t("pd.lockedSchema")})</CardTitle>
                      <CardDescription>Context → Trigger → Decision → Alternatives → 8-POV Reactions → Outcomes. Click untuk membuka rantai kausal lengkap.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative space-y-3 border-l border-intent-teal/30 pl-6">
                        {cif.data.decisionEvents.map((de) => (
                          <button key={`${de.date}-${de.title}`} onClick={() => setSelectedDE(de)} className="panel panel-hover relative block w-full p-3.5 text-left">
                            <span className="absolute -left-[29px] top-4 h-3 w-3 rounded-full bg-intent-teal ring-4 ring-intent-bg" />
                            <div className="flex items-center justify-between gap-2">
                              <span className="mono text-[10px] text-muted-foreground">{de.date}</span>
                              <Badge variant="muted">{de.grounding ? "grounded" : "inferred"}</Badge>
                            </div>
                            <div className="mt-1 text-sm font-semibold leading-snug">{de.title}</div>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2"><span className="text-intent-teal">Decision:</span> {de.decision}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {selectedDE && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDE(null)}>
                      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-intent-surface p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="mono text-[10px] text-muted-foreground">{selectedDE.date}</div>
                            <div className="text-base font-bold leading-snug">{selectedDE.title}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedDE(null)}>✕</Button>
                        </div>
                        <DeSection label="Trigger" text={selectedDE.trigger} />
                        <DeSection label="Decision" text={selectedDE.decision} />
                        <DeSection label="Alternatives considered" text={selectedDE.alternatives} />
                        <DeSection label="Hidden — motivation" text={selectedDE.motivation} hidden />
                        <DeSection label="Hidden — constraint" text={selectedDE.constraint} hidden />
                        <DeSection label="Hidden — pressure" text={selectedDE.pressure} hidden />
                        <DeSection label="Hidden — trade-off" text={selectedDE.tradeoff} hidden />
                        <DeSection label="Expectation vs actual" text={selectedDE.expectation_vs_actual} />
                        <div className="mt-3">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-intent-gold">Stakeholder reactions (8 POV)</div>
                          <div className="space-y-1.5">
                            {POVS.filter((p) => selectedDE.reactions[p]).map((p) => (
                              <div key={p} className="rounded-md bg-white/5 p-2 text-[11px]">
                                <span className="mono font-bold text-intent-teal">{p}:</span> <span className="text-muted-foreground">{selectedDE.reactions[p]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <DeSection label="Short-term outcome" text={selectedDE.immediate_result} />
                        <DeSection label="Long-term impact" text={selectedDE.long_term_impact} />
                        {selectedDE.grounding && <DeSection label="Grounding" text={selectedDE.grounding} hidden />}
                        {selectedDE.open_threads && <DeSection label="Open threads" text={selectedDE.open_threads} />}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div><CardTitle className="text-sm">{t("pd.causalTree")}</CardTitle><CardDescription>{t("pd.causalTreeSub")}</CardDescription></div>
                    <Link href={`/multiverse?projectId=${d.project.id}`}><Button size="sm" variant="outline">Open in Multiverse</Button></Link>
                  </CardHeader>
                  <CardContent className="h-[420px]">
                    {flow.nodes.length === 0 ? (
                      <div className="grid h-full place-items-center text-sm text-muted-foreground">No decision chain recorded.</div>
                    ) : (
                      <FlowCanvas nodes={flow.nodes} edges={flow.edges} height={420} />
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="mirror" forceMount className="data-[state=inactive]:hidden">
              <div className="grid gap-3 md:grid-cols-3">
                {(mirror.data?.analogs ?? []).map((a) => (
                  <Link key={a.project.id} href={`/project/${a.project.slug}`} className="panel panel-hover p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{a.project.name}</span>
                      <span className="mono text-sm font-bold text-intent-gold">{(a.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">{a.rationale}</p>
                    <div className="mono mt-2 text-[10px] text-muted-foreground">TVL 30d {fmtPct(a.projection.tvl30dPct)}</div>
                  </Link>
                ))}
                {mirror.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
              </div>
            </TabsContent>

            <TabsContent value="origin" forceMount className="data-[state=inactive]:hidden">
              {cif.data?.entities && cif.data.entities.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Entity graph — {cif.data.entities.length} entities ({t("pd.lockedSchema")})</CardTitle>
                    <CardDescription>Organization / Person / Investor / Foundation / Exchange / Partner teridentifikasi dari dossier.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-2">
                    {cif.data.entities.slice(0, 12).map((e) => (
                      <div key={e.id} className="rounded-md bg-white/5 p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{e.name}</span>
                          <Badge variant="muted">{e.type}</Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground line-clamp-2">{e.description}</p>
                      </div>
                    ))}
                    {cif.data.entities.length > 12 && <div className="mono grid place-items-center rounded-md bg-white/5 p-2 text-[10px] text-muted-foreground">+{cif.data.entities.length - 12} lagi di entity graph</div>}
                  </CardContent>
                </Card>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {d.actors.map((a) => (
                  <Card key={a.id}><CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{a.name}</span>
                      <span className="mono text-lg font-bold">{a.reliability}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{a.kind} · {a.reason}</div>
                    <Link href="/origin"><Button size="sm" variant="ghost" className="mt-2 h-7">Full dossier →</Button></Link>
                  </CardContent></Card>
                ))}
                {d.actors.length === 0 && <p className="text-sm text-muted-foreground">No tracked actors for this project yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="timeline" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader><CardTitle className="text-sm">{t("pd.swimlane")}</CardTitle>
                  <CardDescription>{cif.data?.timeline ? `${cif.data.timeline.length} historical events dari dossier INTENT` : "Synthetic chain"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-4 border-l border-white/10 pl-6">
                    {(cif.data?.timeline ?? []).map((e) => (
                      <div key={e.id} className="relative">
                        <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-intent-gold ring-4 ring-intent-bg" />
                        <div className="mono text-[10px] text-muted-foreground">
                          {e.date} · {e.type} · {e.participants.join(", ")}
                          {e.url && <a className="ml-2 text-intent-teal hover:underline" href={e.url} target="_blank" rel="noreferrer">source ↗</a>}
                        </div>
                        <div className="text-sm font-medium">{e.name}</div>
                        <p className="text-xs text-muted-foreground">{e.description}</p>
                      </div>
                    ))}
                    {cif.data?.timeline == null && [...d.events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).map((e) => (
                      <div key={e.id} className="relative">
                        <span className={cn("absolute -left-[29px] top-1 h-3 w-3 rounded-full ring-4 ring-intent-bg", e.kind === "decision" ? "bg-intent-teal" : e.kind === "catalyst" ? "bg-intent-gold" : "bg-intent-lime")} />
                        <div className="mono text-[10px] text-muted-foreground">{fmtDate(e.occurredAt)} · {e.kind} · p={e.probability.toFixed(2)}</div>
                        <div className="text-sm">{e.title}</div>
                      </div>
                    ))}
                    {!cif.data?.timeline && d.events.length === 0 && <p className="text-sm text-muted-foreground">Empty timeline.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="knowledge" forceMount className="data-[state=inactive]:hidden">
              {cif.data?.knowledge && cif.data.knowledge.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Knowledge items — {cif.data.knowledge.length} ({t("pd.lockedSchema")}, {t("pd.citeTrail")})</CardTitle>
                    <CardDescription>Setiap item menyimpan evidenceText mentah — one-click path ke sumber (§3 trust chain).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cif.data.knowledge.slice(0, 8).map((k) => (
                      <div key={k.id} className="rounded-md bg-white/5 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{k.name}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="muted">{k.category}</Badge>
                            <Badge variant={evidenceBadge(k.confidence).variant}>{evidenceBadge(k.confidence).label}</Badge>
                            <span className={cn("mono font-bold", k.confidence >= 70 ? "text-intent-lime" : "text-intent-gold")}>{k.confidence}</span>
                          </span>
                        </div>
                        <p className="mt-1 leading-relaxed text-muted-foreground line-clamp-3">{k.description}</p>
                        <CitationPanel
                          level={evidenceBadge(k.confidence).label as "HIGH" | "MED" | "LOW"}
                          provenance={`INTENT dossier · ${k.author === "CIF" ? "INTENT" : k.author ?? "INTENT"} · ${k.evidence?.length ?? 0} evidence links`}
                          passage={k.evidenceText || k.description}
                          href={cif.data?.project?.file ? `https://github.com/Scryptexai/crypto-intelligence-framework/blob/main/${cif.data.project.file}` : undefined}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <Card>
                  <CardHeader><CardTitle className="text-sm">{d.knowledge.total} items</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(d.knowledge.bySource).map(([src, n]) => (
                      <div key={src} className="flex items-center justify-between text-xs">
                        <span className="mono uppercase text-muted-foreground">{src}</span>
                        <span className="mono font-bold">{n}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">{t("pd.highest")}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {d.knowledge.top.map((k) => (
                      <div key={k.statement} className="rounded-md bg-white/5 p-3 text-xs leading-relaxed">
                        {k.statement}
                        <div className="mono mt-1 text-[10px] text-muted-foreground">{k.source} · confidence {(k.confidence * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="signals" forceMount className="data-[state=inactive]:hidden">
              <div className="space-y-3">
                {d.signals.map((sig) => (
                  <Card key={sig.id}><CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radar className="h-4 w-4 text-intent-gold" />
                        <span className="font-semibold">{sig.type.replace(/_/g, " ")}</span>
                      </div>
                      <Badge variant={sig.strength > 0.7 ? "amber" : "default"}>strength {(sig.strength * 100).toFixed(0)}%</Badge>
                    </div>
                    <pre className="mono mt-2 overflow-x-auto rounded bg-black/30 p-2 text-[10px] text-muted-foreground">{JSON.stringify(sig.payload, null, 2)}</pre>
                    <div className="mt-1 text-[10px] text-muted-foreground">detected {timeAgo(sig.detectedAt)}</div>
                  </CardContent></Card>
                ))}
                {d.signals.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active signals.</CardContent></Card>}
                <div className="flex justify-end">
                  <Link href={`/studio?sourceType=signal&sourceId=${d.signals[0]?.id ?? ""}`}>
                    <Button variant="outline" disabled={d.signals.length === 0}><PenSquare /> {t("pd.turnSignal")}</Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

/** One field of the locked DecisionEvent causal chain. */
function DeSection({ label, text, hidden = false }: { label: string; text: string | null; hidden?: boolean }) {
  if (!text) return null;
  return (
    <div className="mt-3">
      <div className={cn("mb-1 text-[10px] font-semibold uppercase tracking-wider", hidden ? "text-violet-300" : "text-intent-teal")}>{label}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

/** Evidence Level badge per ApplicationBlueprint §3.2 (fact-level). */
export function evidenceBadge(conf: number): { label: string; variant: "success" | "amber" | "danger" } {
  if (conf >= 80) return { label: "HIGH", variant: "success" };
  if (conf >= 60) return { label: "MED", variant: "amber" };
  return { label: "LOW", variant: "danger" };
}

function LockOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-intent-bg/60 backdrop-blur-sm">
      <div className="max-w-xs text-center">
        <Lock className="mx-auto mb-2 h-7 w-7 text-intent-gold" />
        <div className="font-semibold">Pro universe project</div>
        <p className="mt-1 text-xs text-muted-foreground">Upgrade to unlock the full deep-dive for non-demo projects.</p>
        <Button variant="amber" size="sm" className="mt-3" onClick={() => window.dispatchEvent(new CustomEvent("cif:open-upgrade"))}>
          <BellPlus className="h-3.5 w-3.5" /> Upgrade
        </Button>
      </div>
    </div>
  );
}
