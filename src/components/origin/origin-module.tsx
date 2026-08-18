"use client";
import { Fragment, useMemo, useState } from "react";
import { PageBanner } from "@/components/shell/promo-surfaces";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, AlertTriangle, Flame, ShieldCheck, ShieldAlert, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCifLive } from "@/hooks/use-cif-live";
import { QueryState } from "@/components/ui/query-state";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Actor {
  id: string; name: string; kind: string; credibilityScore: number; reliability: number;
  hitRate: number; resolvedCalls: number; pendingCalls: number; flags: string[];
}
interface Narrative { id: string; title: string; heat: number; avgEvidence: number; gap: number }
interface Cell { narrativeId: string; narrativeTitle: string; channel: string; evidence: number; gap: number }
interface Claim { id: string; claimText: string; claimDate: string; outcome: string; evidenceLink: string | null; conflictOfInterest: boolean }

const KIND_LABEL: Record<string, string> = { fund: "Fund", kol: "KOL", team: "Team", whale: "Whale", protocol: "Protocol" };

/** Heatmap coloring per spec: merah = low evidence, hijau = high evidence. */
function evidenceColor(v: number) {
  if (v >= 0.7) return "bg-emerald-500/70 text-white";
  if (v >= 0.5) return "bg-intent-lime/40 text-emerald-100";
  if (v >= 0.35) return "bg-intent-gold/60 text-black";
  return "bg-red-500/60 text-white";
}
function heatColor(v: number) {
  // social heat: high heat = amber→red (caution), low = neutral
  if (v >= 0.7) return "bg-intent-gold/80 text-black";
  if (v >= 0.5) return "bg-intent-gold/40 text-amber-100";
  return "bg-white/10 text-muted-foreground";
}

export function OriginModule({ initialActors, initialMatrix }: {
  initialActors: { actors: Actor[] };
  initialMatrix: { matrix: { narratives: Narrative[]; cells: Cell[]; lastUpdated: string }; gaps: { narrative: { id: string; title: string; heat: number }; avgEvidence: number; gap: number }[] };
}) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  const actors = useQuery<{ actors: Actor[]; trustSummary?: { overall: string; topRisks: { actor: string; risk: string }[] } }>({
    queryKey: ["actors"],
    initialData: initialActors,
    queryFn: () => fetch("/api/actors").then((r) => r.json()),
  });
  const matrix = useQuery<{ matrix: { narratives: Narrative[]; cells: Cell[]; lastUpdated: string }; gaps: { narrative: { id: string; title: string; heat: number }; avgEvidence: number; gap: number }[] }>({
    queryKey: ["narratives"],
    initialData: initialMatrix,
    queryFn: () => fetch("/api/narratives").then((r) => r.json()),
    refetchInterval: 3_600_000,
  });

  const [entityQ, setEntityQ] = useState("");
  const [entityLimit, setEntityLimit] = useState(9);
  const live = useCifLive();

  // Prefer LIVE Supabase entities when the bridge is reachable from the browser
  const liveEntities = Boolean(live.data && Array.isArray(live.data.entities) && live.data.entities.length > 0);

  const entitySearch = useQuery<{ entitySearch: { q: string; total: number; rows: { id: string; name: string; type: string; project: string; description: string }[] } }>({
    queryKey: ["cif-entities", entityQ],
    enabled: entityQ.length >= 2 && !liveEntities,
    queryFn: () => fetch(`/api/cif?q=${encodeURIComponent(entityQ)}`).then((r) => r.json()),
  });
  const liveRows = useMemo(() => {
    if (!liveEntities || entityQ.length < 2) return [];
    const needle = entityQ.toLowerCase();
    return (live.data!.entities ?? [])
      .filter((e) => (e.name ?? "").toLowerCase().includes(needle) || (e.type ?? "").toLowerCase().includes(needle))
      .slice(0, entityLimit)
      .map((e) => ({ id: e.id, name: e.name ?? "—", type: e.type ?? "—", project: (e.projectSlug ?? "") as string, description: (e.description ?? "") as string }));
  }, [live.data, liveEntities, entityQ]);
  const rows = liveEntities ? liveRows : entitySearch.data?.entitySearch.rows ?? [];
  const totalEntities = liveEntities ? live.data!.entities.length : entitySearch.data?.entitySearch.total;

  const claims = useQuery<{ report: { name: string; reliability: number; hitRate: number; resolvedCalls: number }; claims: Claim[] }>({
    queryKey: ["actor-claims", selectedActor],
    enabled: !!selectedActor,
    queryFn: async () => {
      const res = await fetch(`/api/actors/${encodeURIComponent(selectedActor!)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const cells = matrix.data?.matrix.cells ?? [];
  const cellFor = (nid: string, ch: string) => cells.find((c) => c.narrativeId === nid && c.channel === ch)?.evidence ?? 0;

  return (
    <div className="grid-bg p-4 lg:p-8">
      <PageBanner img="/media/page-origin.png" alt="INTENT — Know Who Is Selling." />
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Fingerprint className="h-6 w-6 text-intent-lime" /> The Origin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("origin.sub")} ·{" "}
          <span className="mono">{actors.data?.actors.reduce((s, a) => s + a.resolvedCalls + a.pendingCalls, 0) ?? "…"} {t("origin.claims")}</span>.
        </p>
      </div>

      {actors.data?.trustSummary && (
        <div className="mb-4 rounded-xl border border-intent-teal/30 bg-intent-teal/5 p-4 text-sm">
          <p className="font-medium">{actors.data.trustSummary.overall}</p>
          {actors.data.trustSummary.topRisks.slice(0, 2).map((r) => (
            <p key={r.actor} className="mt-1 text-xs text-intent-muted">Top risk: {r.actor} — {r.risk}</p>
          ))}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actor credibility ledger</CardTitle>
            <CardDescription>Hit-rate × sample size from actor_claims, discounted by disclosed conflicts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {actors.isError && <QueryState isError retry={() => actors.refetch()} />}
            {!actors.isLoading && !actors.isError && (actors.data?.actors ?? []).length === 0 && <QueryState isEmpty emptyLabel="Belum ada aktor terlacak." />}
            {actors.isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
            {actors.data?.actors.map((a) => (
              <button key={a.id} onClick={() => setSelectedActor(a.id)} className="panel panel-hover block w-full p-3.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{a.name.slice(0, 2).toUpperCase()}</span>
                    <span className="font-semibold">{a.name}</span>
                    <Badge variant="muted">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.reliability >= 70 ? <ShieldCheck className="h-4 w-4 text-intent-lime" /> : <ShieldAlert className="h-4 w-4 text-intent-gold" />}
                    <span className="mono text-lg font-bold">{a.reliability}</span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className={cn("h-full rounded-full", a.reliability >= 70 ? "bg-intent-lime" : a.reliability >= 45 ? "bg-intent-gold" : "bg-intent-rose")} style={{ width: `${a.reliability}%` }} />
                </div>
                <div className="mono mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>hit rate {(a.hitRate * 100).toFixed(0)}%</span>
                  <span>{a.resolvedCalls} resolved · {a.pendingCalls} pending</span>
                  <span>base {a.credibilityScore}</span>
                </div>
                {a.flags.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {a.flags.slice(0, 2).map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-[11px] text-intent-gold/90">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Narrative Truth Matrix</CardTitle>
              <CardDescription>
                Evidence per channel (hijau = strong, merah = weak). <span className="text-intent-gold">HEAT</span> = social traction. Updated {matrix.data?.matrix.lastUpdated.slice(0, 10)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matrix.isLoading ? (
                <Skeleton className="h-72" />
              ) : (
                <div className="grid grid-cols-[1fr_64px_64px_64px_64px_52px] gap-y-1.5 text-[11px]">
                  <div className="text-muted-foreground">Narrative</div>
                  {["onchain", "docs", "social", "insider", "heat"].map((c) => (
                    <div key={c} className="mono text-center uppercase text-muted-foreground">{c}</div>
                  ))}
                  {(matrix.data?.matrix.narratives ?? []).map((n) => (
                    <Fragment key={n.id}>
                      <div className="pr-2 leading-tight text-foreground">{n.title}</div>
                      {(["onchain", "docs", "social", "insider"] as const).map((ch) => {
                        const v = cellFor(n.id, ch);
                        return (
                          <div key={ch} className={cn("mx-0.5 grid place-items-center rounded py-1.5 mono font-semibold", evidenceColor(v))}>
                            {(v * 100).toFixed(0)}
                          </div>
                        );
                      })}
                      <div className={cn("mx-0.5 grid place-items-center rounded py-1.5 mono font-bold", heatColor(n.heat))}>{(n.heat * 100).toFixed(0)}</div>
                    </Fragment>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-intent-gold/30 bg-intent-gold/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Flame className="h-4 w-4 text-intent-gold" /> Widest heat-vs-evidence gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(matrix.data?.gaps ?? []).map((g, i) => (
                <div key={g.narrative.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="mono text-xs text-intent-gold">#{i + 1}</span> {g.narrative.title}
                  </span>
                  <Badge variant={g.gap > 0.35 ? "danger" : "amber"}>gap +{g.gap.toFixed(2)}</Badge>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">Positive gap = narrative running ahead of verifiable evidence. Prime material for a contrarian thread.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── INTENT entity graph explorer (locked schema) ── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">INTENT entity graph explorer</CardTitle>
          <CardDescription>Search 900+ entities (Organization / Person / Investor / Exchange…) dari locked dataset cif-export/1.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input value={entityQ} onChange={(e) => setEntityQ(e.target.value)} placeholder="cari entitas… mis. 'capital', 'foundation', 'Sec'" className="max-w-sm" />
            {typeof totalEntities === "number" && (
              <Badge variant={liveEntities ? "success" : "muted"}>{liveEntities ? "LIVE Supabase" : "snapshot"} · {totalEntities} entities</Badge>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <div key={e.id} className="rounded-md bg-white/5 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{e.name}</span>
                  <Badge variant="muted">{e.type}</Badge>
                </div>
                <div className="mono mt-0.5 text-[10px] text-intent-teal">{e.project}</div>
                <p className="mt-1 text-muted-foreground line-clamp-2">{e.description}</p>
              </div>
            ))}
            {entityQ.length >= 2 && !liveEntities && entitySearch.isLoading && <Skeleton className="h-20 md:col-span-2 xl:col-span-3" />}
            {entityQ.length >= 2 && !entitySearch.isLoading && rows.length === 0 && (
              <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">Tidak ada entitas yang cocok.</p>
            )}
            {liveEntities && rows.length > 0 && rows.length < (live.data?.entities.length ?? 0) && (
              <button
                className="mt-1 text-xs text-intent-teal hover:underline md:col-span-2 xl:col-span-3"
                onClick={() => setEntityLimit((v) => v + 24)}
              >
                Load more ({(live.data?.entities.length ?? 0) - rows.length} lagi)
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Claims modal ── */}
      {selectedActor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedActor(null)}>
          <div className="panel max-h-[80vh] w-full max-w-2xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{claims.data?.report.name}</div>
                <div className="mono text-xs text-muted-foreground">
                  reliability {claims.data?.report.reliability} · hit rate {((claims.data?.report.hitRate ?? 0) * 100).toFixed(0)}% · {claims.data?.report.resolvedCalls} resolved calls
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedActor(null)}>
                <X />
              </Button>
            </div>
            {claims.isLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-2">
                {claims.data?.claims.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-md bg-white/5 p-2.5 text-xs">
                    <Badge variant={c.outcome === "correct" ? "success" : c.outcome === "incorrect" ? "danger" : "muted"} className="mt-0.5 shrink-0">
                      {c.outcome}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="leading-relaxed">{c.claimText}</p>
                      <div className="mono mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {c.claimDate.slice(0, 10)}
                        {c.conflictOfInterest && <span className="text-intent-gold">⚠ conflict-of-interest flagged</span>}
                        {c.evidenceLink && (
                          <a className="inline-flex items-center gap-0.5 text-intent-teal hover:underline" href={c.evidenceLink} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>
                            evidence <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
