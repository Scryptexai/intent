"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, FileDown, PenSquare, Dices, ScanSearch, GitBranch, Fingerprint, Lock, ShieldAlert, Compass, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { useI18n, type DictKey } from "@/lib/i18n";
import { emitUnauthorized } from "@/hooks/use-session";
import { fmtPct, fmtUsd, cn } from "@/lib/utils";
import type { PremiumBrief } from "@/services/decision-brief";

interface Brief {
  locked: boolean;
  plan?: string;
  project: { name: string; slug: string; category: string; tvlUsd: number; tvl30dPct: number; sentiment: number };
  cifScore: number;
  brief: PremiumBrief;
  intel?: { oneLiner: string; threeKeyFacts: string[]; verdict: string; confidence: string };
  why?: { name: string; activation: number }[];
  trackRecord?: { statement: string; outcome: string; asOf: string }[];
  actions?: Record<string, unknown>;
}

function Dim({ label, value, tone }: { label: string; value: number; tone: "teal" | "gold" | "rose" }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="mono text-sm font-semibold text-foreground">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full", tone === "teal" && "bg-intent-teal", tone === "gold" && "bg-intent-gold", tone === "rose" && "bg-intent-rose")}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Premium Decision Brief — 7 seksi, editorial, evidence-first (PRODUCT-DIRECTION). */
export function BriefClient({ slug }: { slug: string }) {
  const { t } = useI18n();
  const q = useQuery<Brief>({
    queryKey: ["brief", slug],
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/brief/${slug}`);
      if (res.status === 404) throw new Error("not found");
      return res.json();
    },
  });
  const b = q.data;

  if (q.isLoading) return <div className="space-y-4 p-8">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (q.isError || !b)
    return (
      <div className="grid place-items-center p-20 text-center">
        <div>
          <p className="text-lg font-bold">{t("brief.notfound")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("brief.notfound.sub")}</p>
          <Link href="/universe"><Button className="mt-4" variant="outline">{t("brief.openUniverse")}</Button></Link>
        </div>
      </div>
    );

  const pb = b.brief;
  const showInterpretation = !b.locked;
  const mLabel = (m: string): string => {
    const map: Record<string, DictKey> = {
      tvl: "brief.metric.tvl",
      volume: "brief.metric.volume",
      funding_div: "brief.metric.funding_div",
      tvl_sentiment_div: "brief.metric.tvl_sentiment_div",
      unlock_vs_momentum: "brief.metric.unlock_vs_momentum",
      volume_rotation: "brief.metric.volume_rotation",
      whale_tape: "brief.metric.whale_tape",
    };
    return map[m] ? t(map[m]) : m.replace(/_/g, " ");
  };

  return (
    <div className="grid-bg mx-auto max-w-5xl p-4 lg:p-8">
      {/* framing + identitas */}
      <div className="eyebrow text-intent-gold">{t("brief.framing")}</div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{b.project.name}</h1>
        <div className="flex gap-2">
          <Badge variant="muted">{b.project.category}</Badge>
          <Badge variant="muted">{fmtUsd(b.project.tvlUsd)} TVL</Badge>
          <Badge variant={b.project.tvl30dPct >= 0 ? "success" : "danger"}>{fmtPct(b.project.tvl30dPct)} 30d</Badge>
        </div>
      </div>

      {/* ── 1+2: The Decision + Current Read ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.dec.title")}</CardTitle></CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <ul className="space-y-1.5">
              {[t("brief.dec.q1"), t("brief.dec.q2"), t("brief.dec.q3"), t("brief.dec.q4")].map((qq) => (
                <li key={qq} className="text-[13px] leading-relaxed text-foreground/90">— {qq.replaceAll("{p}", b.project.name)}</li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-white/[0.06] pt-3 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("brief.dec.alloc")}</dt><dd className="text-right">capital · time · effort</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("brief.dec.horizon")}</dt><dd className="mono">{pb.decision.horizon}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("brief.dec.exposure")}</dt><dd className="text-right">{pb.decision.exposure}</dd></div>
              <div className="flex justify-between gap-4"><dt className="shrink-0 text-muted-foreground">{t("brief.dec.open")}</dt><dd className="text-right text-muted-foreground">{pb.decision.open}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-intent-teal/25">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.read")}</CardTitle></CardHeader>
          <CardContent className="space-y-5 p-6 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">{t(`brief.concl.${pb.read.conclusion}` as DictKey)}</div>
            <div className="space-y-3">
              <Dim label={t("brief.dim.eq")} value={pb.read.evidenceQuality} tone="teal" />
              <Dim label={t("brief.dim.pc")} value={pb.read.patternConfidence} tone="gold" />
              <Dim label={t("brief.dim.tu")} value={pb.read.trajectoryUncertainty} tone="rose" />
            </div>
            <p className="mono text-[10px] text-muted-foreground">as-of {pb.asOf.slice(0, 10)} · dossier {b.cifScore}/100</p>
          </CardContent>
        </Card>
      </div>

      {/* ribbon kuota — interpretasi premium, bukti tetap gratis */}
      {b.locked && (
        <Card className="mt-4 border-intent-gold/40 bg-intent-gold/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-intent-gold" /> {t("brief.locked.title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("brief.locked.sub1")} {t("brief.locked.sub2")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="amber" asChild><Link href="/upgrade">{t("brief.locked.cta1")}</Link></Button>
              <Button variant="outline" onClick={() => emitUnauthorized()}>{t("brief.locked.cta2")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── interpretasi premium: intel + why ── */}
      {showInterpretation && b.intel && (
        <Card className="mt-4">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.intel")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-6 pt-0">
            <p className="text-sm leading-relaxed text-foreground/90">{b.intel.oneLiner}</p>
            <p className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-relaxed text-foreground/80">{b.intel.verdict}</p>
            <div className="flex flex-wrap gap-2">
              {(b.why ?? []).map((w) => (
                <Badge key={w.name} variant="muted">{w.name} · {(w.activation * 100).toFixed(0)}%</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3: What changed / why it matters ── */}
      <Card className="mt-4">
        <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.changed.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-2.5 p-6 pt-0">
          {pb.changed.map((c, i) => (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md bg-white/[0.03] px-3 py-2 text-xs">
              <span className="font-medium text-foreground">
                {mLabel(c.metric)} <span className="text-muted-foreground">· {t(`brief.dir.${c.direction}` as DictKey)} {c.deviation > 0 ? "+" : ""}{c.deviation}%</span>
              </span>
              <span className={cn("text-[11px]", c.thesis === "strengthens" ? "text-intent-lime" : c.thesis === "weakens" ? "text-intent-rose" : "text-muted-foreground")}>
                {t(`brief.impact.${c.thesis}` as DictKey)}
              </span>
              <span className="mono w-full text-[10px] text-muted-foreground">
                {c.asOf.slice(0, 10)} · {c.source}
                {c.confidenceImpact !== 0 && <> · {t("brief.conf")} {c.confidenceImpact > 0 ? "+" : ""}{c.confidenceImpact.toFixed(2)}</>}
              </span>
              {c.note && <span className="w-full border-l-2 border-intent-gold/40 pl-2 text-[11px] leading-relaxed text-foreground/80">{c.note}</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── 4: Evidence ledger + unknowns (GRATIS, tidak dikubur) ── */}
      <Card className="mt-4">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4 text-intent-teal" /> {t("brief.ledger.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-6 pt-0">
          {pb.ledger.length === 0 && <p className="text-xs text-muted-foreground">{t("brief.ledger.empty")}</p>}
          {pb.ledger.map((e, i) => (
            <div key={i} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[13px] font-semibold leading-snug">{e.claim}</span>
                <Badge variant={e.level === "HIGH" ? "success" : e.level === "MED" ? "amber" : "muted"}>{e.level}</Badge>
              </div>
              <p className="mt-2 border-l-2 border-intent-teal/40 pl-3 text-xs leading-relaxed text-muted-foreground">{e.passage}</p>
              <p className="mono mt-2 text-[10px] text-muted-foreground">
                {e.source} · {e.asOf.slice(0, 10)}
                {e.conflict && <span className="text-intent-rose"> · ⚠ {e.conflict}</span>}
                {e.limitation && <span className="text-amber-300/80"> · {e.limitation}</span>}
              </p>
            </div>
          ))}
          {pb.unknowns.length > 0 && (
            <div className="rounded-md border border-intent-rose/25 bg-intent-rose/[0.05] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-intent-rose">{t("brief.ledger.unknown")}</div>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {pb.unknowns.map((u) => <li key={u}>· {u}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5: Historical analogs (premium) ── */}
      {showInterpretation && (
        <Card className="mt-4">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.analogs.title")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-3">
            {pb.analogs.length === 0 && <p className="text-xs text-muted-foreground">{t("brief.analogs.empty")}</p>}
            {pb.analogs.map((a) => (
              <Link key={a.slug} href={`/brief/${a.slug}`} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-xs transition-colors hover:border-intent-gold/40">
                <div className="flex justify-between"><span className="font-semibold">{a.name}</span><span className="mono text-intent-gold">{Math.round(a.similarity * 100)}%</span></div>
                <p className="mt-2 text-muted-foreground"><span className="text-foreground/80">{t("brief.analogs.struct")}:</span> {a.structural}</p>
                <p className="mt-1.5 text-muted-foreground"><span className="text-foreground/80">{t("brief.analogs.mismatch")}:</span> {a.mismatch}</p>
                <p className="mt-1.5 text-muted-foreground"><span className="text-foreground/80">{t("brief.analogs.context")}:</span> {a.context}</p>
                {a.sequence.length > 0 && (
                  <p className="mt-1.5 text-muted-foreground">
                    <span className="text-foreground/80">{t("brief.analogs.seq")}:</span> {a.sequence.join(" → ")}
                  </p>
                )}
                <p className="mt-1.5 text-muted-foreground"><span className="text-foreground/80">{t("brief.analogs.outcome")}:</span> {a.outcome}</p>
                <p className="mt-1.5 text-intent-teal/90">{t("brief.analogs.relevance")}: {a.relevance}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 6: Red team (premium, setara visual tesis) ── */}
      {showInterpretation && (
        <Card className="mt-4 border-intent-rose/25">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-intent-rose" /> {t("brief.redteam.title")}</CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">{t("brief.redteam.dep")}</p>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {pb.redTeam.risks.map((r) => <li key={r}>· {r}</li>)}
              {pb.redTeam.conflicts.map((c) => <li key={c} className="text-intent-rose/80">· {c}</li>)}
              {pb.redTeam.dependencies.map((d) => <li key={d} className="text-amber-300/80">· {d}</li>)}
            </ul>
            <ul className="space-y-1.5 border-l border-white/[0.06] pl-4 text-xs text-muted-foreground">
              {pb.redTeam.dissent.map((d) => <li key={d}>· {d}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── 7: Decision gates ── */}
      <Card className="mt-4">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Compass className="h-4 w-4 text-intent-gold" /> {t("brief.gates.title")}</CardTitle></CardHeader>
        <CardContent className="grid gap-5 p-6 pt-0 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("brief.gates.watch")}</div>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">{pb.gates.watch.map((w) => <li key={w}>· {w}</li>)}</ul>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("brief.gates.invalidation")}</div>
            <ul className="mt-1.5 space-y-1 text-xs text-intent-rose/80">{pb.gates.invalidation.map((w) => <li key={w}>· {w}</li>)}</ul>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("brief.gates.next")}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{pb.gates.next}</p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("brief.gates.seek")}</div>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">{pb.gates.seek.map((w) => <li key={w}>· {w}</li>)}</ul>
            </div>
            <p className="mono text-[10px] text-muted-foreground">{t("brief.gates.review")}: {pb.gates.reviewDate}</p>
          </div>
        </CardContent>
      </Card>

      {/* track record publik */}
      {(b.trackRecord ?? []).length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{t("brief.tr")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-6 pt-0">
            {b.trackRecord!.map((tr) => (
              <div key={tr.statement} className="rounded-md bg-white/5 p-2.5 text-xs">
                <Badge variant={tr.outcome === "pass" ? "success" : tr.outcome === "pending" ? "default" : "muted"}>{tr.outcome}</Badge>
                <p className="mt-1 text-muted-foreground">{tr.statement}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* actions */}
      {showInterpretation && b.actions && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={(b.actions.memo as string) ?? "#"} target="_blank"><Button variant="outline"><FileDown /> IC Memo</Button></Link>
          <Link href={(b.actions.studio as string) ?? "#"}><Button><PenSquare /> {t("brief.studio")}</Button></Link>
          <Link href={(b.actions.simulate as string) ?? "#"}><Button variant="outline"><Dices /> Simulate</Button></Link>
          {(b.actions.tools as { mirror?: string; multiverse?: string; origin?: string }) && (
            <>
              <Link href={(b.actions.tools as { mirror: string }).mirror}><Button variant="ghost"><ScanSearch /> Mirror</Button></Link>
              <Link href={(b.actions.tools as { multiverse: string }).multiverse}><Button variant="ghost"><GitBranch /> Multiverse</Button></Link>
              <Link href={(b.actions.tools as { origin: string }).origin}><Button variant="ghost"><Fingerprint /> Origin</Button></Link>
            </>
          )}
          <Link href="/track-record" className="ml-auto"><Button variant="link">{t("brief.publish")} <ArrowUpRight className="h-3 w-3" /></Button></Link>
        </div>
      )}
    </div>
  );
}
