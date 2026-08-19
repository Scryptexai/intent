"use client";
import { useEffect, useState } from "react";
import { PageBanner } from "@/components/shell/promo-surfaces";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Dices, Lock, Play, Crown, Save, Copy, Check, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/primitives";
import * as Slider from "@radix-ui/react-slider";
import { EChart } from "@/components/charts/echart";
import { usePlan } from "@/components/shell/plan-context";
import { atLeast } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { useEdgeStore } from "@/stores/edge";
import { emitUnauthorized } from "@/hooks/use-session";
import { fmtPct, timeAgo } from "@/lib/utils";

interface SimVariable { id: string; label: string; min: number; max: number; step: number; unit: string; baseline: number; description: string }
interface SimResult {
  recommendation?: string;
  projectId: string;
  variable: SimVariable;
  value: number;
  runs: number;
  distribution: { bucket: string; count: number; pct: number }[];
  expected: { tvlPct: number; sentimentDelta: number; volumePct: number };
  percentiles: { min: number; p10: number; p50: number; p90: number; max: number };
  patternExposure: { slug: string; name: string; activation: number }[];
}
interface SavedSim { id: string; variable: string; value: number; projectName: string; shareToken: string | null; createdAt: string; result: { expectedTvlPct: number; p50: number } }

export function EdgeModule({
  projects,
  initialVariables,
  initialSaved,
}: {
  projects: { id: string; name: string; category: string; slug: string }[];
  initialVariables: { variables: SimVariable[] };
  initialSaved: { simulations: SavedSim[] };
}) {
  const { t } = useI18n();
  const { plan, loading } = usePlan();
  const qc = useQueryClient();
  const { projectId, variableId, setProject, setVariable } = useEdgeStore();
  const [value, setValue] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const variables = useQuery<{ variables: SimVariable[] }>({
    queryKey: ["edge-variables"],
    initialData: initialVariables,
    queryFn: () => fetch("/api/edge/variables").then((r) => r.json()),
  });
  const variable = variables.data?.variables.find((v) => v.id === variableId) ?? null;

  useEffect(() => {
    if (variable && value === null) setValue(variable.baseline);
    if (variable && (value !== null && (value < variable.min || value > variable.max))) setValue(variable.baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variable?.id]);

  const sim = useQuery<SimResult>({
    queryKey: ["edge-sim", projectId, variableId, value],
    enabled: !!variable && value !== null && atLeast(plan, "pro"),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await fetch(`/api/edge/simulate?projectId=${projectId}&variable=${variableId}&value=${value}`);
      if (!res.ok) throw new Error("sim failed");
      return res.json();
    },
  });

  const saved = useQuery<{ simulations: SavedSim[] }>({
    queryKey: ["edge-saved", projectId],
    enabled: atLeast(plan, "pro"),
    initialData: projectId === "p-blur" ? initialSaved : undefined,
    queryFn: () => fetch(`/api/edge/simulations?projectId=${projectId}`).then((r) => r.json()),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/edge/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, variable: variableId, value }),
      });
      if (res.status === 401) emitUnauthorized();
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edge-saved"] }),
  });

  const distOption = sim.data
    ? {
        animation: false,
        grid: { left: 40, right: 16, top: 16, bottom: 28 },
        tooltip: { trigger: "axis", backgroundColor: "#1c2129", borderColor: "#2d333b", textStyle: { color: "#e6edf3", fontSize: 11 } },
        xAxis: { type: "category", data: sim.data.distribution.map((b) => b.bucket), axisLabel: { color: "#8b949e", fontSize: 10, interval: Math.ceil(sim.data.distribution.length / 12) }, axisLine: { lineStyle: { color: "#2d333b" } } },
        yAxis: { type: "value", axisLabel: { color: "#8b949e", fontSize: 10 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
        series: [
          {
            type: "bar",
            data: sim.data.distribution.map((b) => ({ value: b.pct, itemStyle: { color: b.bucket.startsWith("-") ? "#FB7185" : b.bucket === "+0%" ? "#8b949e" : "#A3E635", borderRadius: [3, 3, 0, 0] } })),
            barWidth: "70%",
          },
        ],
      }
    : null;

  return (
    <div className="grid-bg relative p-4 lg:p-8">
      <PageBanner img="/media/page-edge.png" alt="INTENT — Test Your Thesis Before the Market Does." />
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Dices className="h-6 w-6 text-intent-gold" /> The Edge
          </h1>
          <Badge variant="amber" className="gap-1"><Crown className="h-3 w-3" /> PRO MODULE</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("edge.sub")}</p>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : plan === "free" ? (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 z-10 grid place-items-center bg-intent-bg/70 backdrop-blur-sm">
            <div className="max-w-sm text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-intent-gold" />
              <div className="text-lg font-semibold">{t("edge.locked.title")}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t("edge.locked.sub")}</p>
              <Button variant="amber" className="mt-4" onClick={() => window.dispatchEvent(new CustomEvent("cif:open-upgrade"))}>
                <Crown /> {t("edge.locked.cta")}
              </Button>
            </div>
          </div>
          <CardContent className="p-6 opacity-40 blur-[1px]">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sandbox variables</div>
            <div className="space-y-2">
              {initialVariables.variables.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md bg-white/5 p-2.5 text-xs">
                  <span>{v.label}</span>
                  <span className="mono text-muted-foreground">{v.min}–{v.max} {v.unit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card>
            <CardHeader><CardTitle className="text-sm">Scenario setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 text-xs text-muted-foreground">Target project</div>
                <Select value={projectId} onValueChange={setProject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {p.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-muted-foreground">Counter-factual variable</div>
                <Select value={variableId} onValueChange={setVariable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(variables.data?.variables ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {variable && <p className="mt-1.5 text-[11px] text-muted-foreground">{variable.description}</p>}
              </div>
              {variable && value !== null && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{variable.label}</span>
                    <span className="mono font-bold text-intent-gold">{value}{variable.unit}</span>
                  </div>
                  <Slider.Root
                    className="relative flex h-5 w-full touch-none select-none items-center"
                    value={[value]}
                    min={variable.min}
                    max={variable.max}
                    step={variable.step}
                    onValueChange={([v]) => setValue(v)}
                  >
                    <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-white/10">
                      <Slider.Range className="absolute h-full rounded-full bg-intent-gold" />
                    </Slider.Track>
                    <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-intent-gold bg-intent-surface shadow focus:outline-none" aria-label={variable.label} />
                  </Slider.Root>
                  <div className="mono mt-1 flex justify-between text-[9px] text-muted-foreground">
                    <span>{variable.min}{variable.unit}</span>
                    <span>baseline {variable.baseline}{variable.unit}</span>
                    <span>{variable.max}{variable.unit}</span>
                  </div>
                </div>
              )}
              <Button className="w-full" disabled={applyMutation.isPending || value === null} onClick={() => applyMutation.mutate()}>
                <Save /> Apply Simulation (share with team)
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {sim.data?.recommendation && !sim.isFetching && (
              <div className="rounded-xl border border-intent-gold/30 bg-intent-gold/5 p-4 text-sm">
                <span className="eyebrow text-intent-gold">Recommendation</span>
                <p className="mt-1 text-foreground/90">{sim.data.recommendation}</p>
              </div>
            )}
            {sim.isFetching && <Skeleton className="h-16" />}
            {sim.data && !sim.isFetching && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card><CardContent className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Expected TVL 30d</div>
                  <div className={`mono mt-1 text-2xl font-bold ${sim.data.expected.tvlPct >= 0 ? "text-intent-lime" : "text-intent-rose"}`}>{fmtPct(sim.data.expected.tvlPct)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">min / median / max</div>
                  <div className="mono mt-1 text-sm font-bold">{fmtPct(sim.data.percentiles.min)} · {fmtPct(sim.data.percentiles.p50)} · {fmtPct(sim.data.percentiles.max)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">p10 / p90</div>
                  <div className="mono mt-1 text-sm font-bold">{fmtPct(sim.data.percentiles.p10)} · {fmtPct(sim.data.percentiles.p90)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Paths</div>
                  <div className="mono mt-1 text-2xl font-bold">{sim.data.runs.toLocaleString()}</div>
                </CardContent></Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Probability distribution — TVL after 30 days</CardTitle>
                <CardDescription>{sim.data ? `${sim.data.variable.label} = ${sim.data.value}${sim.data.variable.unit}` : "Configure the slider to simulate."}</CardDescription>
              </CardHeader>
              <CardContent>{sim.isLoading ? <Skeleton className="h-64" /> : distOption ? <EChart option={distOption as never} height={260} /> : null}</CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4" /> Applied simulations (team-shared)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {saved.isLoading && <Skeleton className="h-16" />}
                {saved.data?.simulations.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Nothing applied yet.</p>}
                {saved.data?.simulations.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-white/5 p-2.5 text-xs">
                    <div>
                      <span className="font-semibold">{s.variable}</span> = <span className="mono text-intent-gold">{s.value}</span>
                      <span className="ml-2 text-muted-foreground">median {fmtPct(s.result.p50)} · {timeAgo(s.createdAt)}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${location.origin}/edge?sim=${s.shareToken}`);
                        setCopied(s.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                    >
                      {copied === s.id ? <Check className="text-intent-lime" /> : <Copy />} Share
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {sim.data && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Active pattern exposure driving variance</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {sim.data.patternExposure.map((p) => (
                    <Badge key={p.slug} variant={p.activation > 0.6 ? "amber" : "default"}>{p.name} · {(p.activation * 100).toFixed(0)}%</Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
