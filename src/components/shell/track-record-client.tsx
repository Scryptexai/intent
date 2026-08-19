"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Trophy, CalendarClock, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/primitives";
import { useSession } from "@/hooks/use-session";
import { emitUnauthorized } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";

interface Benchmark {
  title: string;
  type: string;
  category: string;
  given: string[];
  expect: string[];
  outcome: string;
  verdict?: string;
  recall?: number;
}
interface Call {
  id: string;
  projectId: string;
  projectName: string;
  statement: string;
  triggerCondition: string;
  patternConfidence: number;
  trajectoryProbability: number;
  asOfDate: string;
  resolveAfter: string;
  outcome: "pending" | "pass" | "fail" | "inconclusive";
  gradedAt: string | null;
}

/** Public Track Record — closed backtests + live calibration calls (§3.3/§9.3). */
export function TrackRecordClient() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const session = useSession();
  const canWrite = session.data?.user && session.data.user.role !== "viewer";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ projectId: "p-blur", statement: "", triggerCondition: "", patternConfidence: 0.7, trajectoryProbability: 0.5, resolveAfter: "2026-11-01" });

  const cif = useQuery<{ benchmarks: Benchmark[] }>({
    queryKey: ["cif-benchmarks"],
    staleTime: 10 * 60_000,
    queryFn: () => fetch("/api/cif").then((r) => r.json()),
  });
  const cal = useQuery<{ calls: Call[]; calibrationScore: number | null; resolvedCount: number }>({
    queryKey: ["calibration"],
    staleTime: 60_000,
    queryFn: () => fetch("/api/calibration").then((r) => r.json()),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calibration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.status === 401) emitUnauthorized();
      if (!res.ok) throw new Error("publish failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calibration"] });
      setOpen(false);
    },
  });

  const grade = useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome: "pass" | "fail" | "inconclusive" }) => {
      const res = await fetch(`/api/calibration/${id}/grade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome }) });
      if (res.status === 401) emitUnauthorized();
      if (!res.ok) throw new Error("grade failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calibration"] }),
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-intent-gold" /> {t("tr.title")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t("tr.sub")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cal.data?.calibrationScore != null && (
            <Badge variant={cal.data.calibrationScore >= 0.6 ? "success" : "amber"}>
              calibration {Math.round(cal.data.calibrationScore * 100)}% · {cal.data.resolvedCount} resolved
            </Badge>
          )}
          {canWrite && (
            <Button size="sm" onClick={() => setOpen((v) => !v)}>
              <Plus /> {t("tr.publish")}
            </Button>
          )}
        </div>
      </div>

      {open && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm">{t("tr.publishTitle")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Statement (Current Read)</Label>
              <Input value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} placeholder="Read dominan berbasis pattern-alignment…" />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger condition (objective, checkable)</Label>
              <Input value={form.triggerCondition} onChange={(e) => setForm({ ...form, triggerCondition: e.target.value })} placeholder="mis. 7d sell-through > 35%" />
            </div>
            <div className="space-y-1.5">
              <Label>Resolve after</Label>
              <Input type="date" value={form.resolveAfter} onChange={(e) => setForm({ ...form, resolveAfter: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Pattern confidence {form.patternConfidence.toFixed(2)}</Label>
              <Input type="range" min={0} max={1} step={0.05} value={form.patternConfidence} onChange={(e) => setForm({ ...form, patternConfidence: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Trajectory probability {form.trajectoryProbability.toFixed(2)} (bukan "success probability")</Label>
              <Input type="range" min={0} max={1} step={0.05} value={form.trajectoryProbability} onChange={(e) => setForm({ ...form, trajectoryProbability: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Button disabled={publish.isPending || form.statement.length < 10 || form.triggerCondition.length < 10} onClick={() => publish.mutate()}>
                Publish (timestamped, public)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">{t("tr.live")}</CardTitle>
          <CardDescription>Pending = masih dalam resolution window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {cal.isLoading && [1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          {cal.data?.calls.map((c) => (
            <div key={c.id} className="rounded-md bg-white/5 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{c.projectName}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="muted">PC {(c.patternConfidence * 100).toFixed(0)}%</Badge>
                  <Badge variant="muted">TP {(c.trajectoryProbability * 100).toFixed(0)}%</Badge>
                  <Badge variant={c.outcome === "pass" ? "success" : c.outcome === "fail" ? "danger" : c.outcome === "inconclusive" ? "amber" : "default"}>{c.outcome}</Badge>
                </span>
              </div>
              <p className="mt-1 leading-relaxed">{c.statement}</p>
              <p className="mono mt-1 text-[10px] text-muted-foreground">
                trigger: {c.triggerCondition} · as-of {c.asOfDate.slice(0, 10)} → resolve ≥ {c.resolveAfter.slice(0, 10)}
              </p>
              {canWrite && c.outcome === "pending" && (
                <div className="mt-2 flex gap-1.5">
                  {(["pass", "fail", "inconclusive"] as const).map((o) => (
                    <Button key={o} size="sm" variant="outline" disabled={grade.isPending} onClick={() => grade.mutate({ id: c.id, outcome: o })}>
                      {o}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("tr.closed")}</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {cif.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
        {cif.data?.benchmarks.map((b) => (
          <Card key={b.title} className="panel-hover">
            <CardHeader>
              <CardTitle className="text-sm leading-snug">{b.title}</CardTitle>
              <CardDescription>{b.category}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-1">
                <Badge variant="default">{b.type}</Badge>
                {b.verdict && <Badge variant="success">{b.verdict}</Badge>}
                {typeof b.recall === "number" && <Badge variant="amber">recall {b.recall}</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">{b.expect.map((g) => <span key={g} className="rounded bg-intent-teal/10 px-1.5 py-0.5 mono text-[10px] text-blue-300">{g}</span>)}</div>
              <p className="leading-relaxed text-muted-foreground">{b.outcome}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-intent-teal/30 bg-intent-teal/5">
        <CardContent className="flex items-start gap-3 p-4">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-intent-teal" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Guardrail anti-"hedged both ways": trigger wajib objektif, weighting nyata (bukan 50/50), dan resolusi di-grade publik termasuk yang salah atau inconclusive.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
