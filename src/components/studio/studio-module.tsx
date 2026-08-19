"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageBanner } from "@/components/shell/promo-surfaces";
import {
  Sparkles,
  Loader2,
  Save,
  Copy,
  Check,
  Send,
  ImageIcon,
  Lock,
  Crown,
  Database,
  FileText,
  History,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/primitives";
import { EChart } from "@/components/charts/echart";
import { usePlan } from "@/components/shell/plan-context";
import { emitUnauthorized } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn, fmtUsd, timeAgo } from "@/lib/utils";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false, loading: () => <Skeleton className="h-96" /> });

/* ── types ─────────────────────────────────────────────────────────────── */
interface Sources {
  airdrops: { id: string; name: string; token: string; locked: boolean }[];
  signals: { id: string; name: string; projectId: string; locked: boolean }[];
  patterns: { id: string; name: string }[];
}
interface Template { id: string; name: string; description: string; structure: string[] }
interface Draft {
  id: string; templateId: string; sourceType: string; sourceId: string;
  content: string; status: string; shareUrl: string | null; createdAt: string;
}
type SourceType = "airdrop" | "signal" | "pattern";

const TONE_OPTIONS = [
  { id: "professional", label: "Professional — firm, factual" },
  { id: "casual", label: "Casual — punchy, native" },
  { id: "controversial", label: "Controversial — spicy, contrarian" },
];

export function StudioModule({
  sources,
  templates,
  initialDrafts,
  initialSourceType,
  initialSourceId,
  initialCtx,
}: {
  sources: Sources;
  templates: Template[];
  initialDrafts: Draft[];
  initialSourceType?: string;
  initialSourceId?: string;
  initialCtx?: Record<string, unknown> | null;
}) {
  const [sourceType, setSourceType] = useState<SourceType>((initialSourceType as SourceType) || "airdrop");
  const [sourceId, setSourceId] = useState<string>(initialSourceId || sources.airdrops[0]?.id || "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [tone, setTone] = useState("professional");

  const [ctx, setCtx] = useState<Record<string, unknown> | null>(initialCtx ?? null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxError, setCtxError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [toast, setToast] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ today: number; limit: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { plan } = usePlan();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"data" | "editor">("data");

  const refreshUsage = useCallback(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((d) => d.usage && setUsage(d.usage))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  /* ── load raw data preview ── */
  useEffect(() => {
    if (!sourceId) return;
    setCtxLoading(true);
    setCtxError(null);
    fetch(`/api/studio-context?sourceType=${sourceType}&sourceId=${encodeURIComponent(sourceId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? "Failed to load");
        return r.json();
      })
      .then((d) => setCtx(d))
      .catch((e) => setCtxError(e.message))
      .finally(() => setCtxLoading(false));
  }, [sourceType, sourceId]);

  /* ── generate (streaming) ── */
  const generate = useCallback(async () => {
    if (!sourceId || generating) return;
    setGenerating(true);
    setGenError(null);
    setContent("");
    setShareUrl(null);
    setSavedId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceId, templateId, tone }),
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401) emitUnauthorized();
        const body = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setGenError("This source belongs to the Pro universe.");
          window.dispatchEvent(new CustomEvent("cif:open-upgrade"));
        } else if (res.status === 429) {
          setGenError(body.message ?? "Daily free limit reached.");
          window.dispatchEvent(new CustomEvent("cif:open-upgrade"));
        } else {
          setGenError(body.error ?? "Generation failed");
        }
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setContent(acc);
        }
      }
      setOriginal(acc);
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "generate", meta: { template: templateId } }) }).catch(() => {});
    } catch (e) {
      if ((e as Error).name !== "AbortError") setGenError("Generation failed");
    } finally {
      setGenerating(false);
      refreshUsage();
    }
  }, [sourceType, sourceId, templateId, tone, generating, refreshUsage]);

  /* ── save / share ── */
  async function saveDraft(): Promise<string | null> {
    if (!content) return null;
    if (savedId) {
      await fetch("/api/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId, editedContent: content }),
      });
      return savedId;
    }
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, sourceId, templateId, generatedContent: original || content, editedContent: content }),
    });
    const d = await res.json();
    setSavedId(d.draft?.id ?? null);
    return d.draft?.id ?? null;
  }

  async function copyToClipboard() {
    const withBadge = content.includes("Powered by INTENT") ? content : `${content}\n\n— Powered by INTENT`;
    await navigator.clipboard.writeText(withBadge);
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "share", meta: { kind: "copy" } }) }).catch(() => {});
    setCopied(true);
    flash("Copied — paste-ready for X / LinkedIn. Tracking badge included.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function directPost() {
    const id = await saveDraft();
    if (!id) return;
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: id, content }),
    });
    const d = await res.json();
    if (d.shareUrl) {
      setShareUrl(d.shareUrl);
      flash(d.simulated ? "Simulated Direct Post — OAuth placeholder active." : "Posted!");
    }
  }

  /* ── truth card params derived from the data preview ── */
  const truthCard = useMemo(() => {
    if (!ctx) return null;
    const data = (ctx as { data?: Record<string, unknown> }).data ?? {};
    const airdrop = data.airdrop as { token: string; sell_pressure_7d_pct: number; claimants: number; dropped_usd: number } | null;
    const projectName = (ctx as { projectName?: string }).projectName ?? "Project";
    if (airdrop) {
      return {
        url: `/api/og/truth-card?stat=${airdrop.sell_pressure_7d_pct}%25&label=${encodeURIComponent(`of ${airdrop.token} recipients sold within 7 days`)}&project=${encodeURIComponent(projectName)}&footnote=${encodeURIComponent(`POV Matrix · ${airdrop.claimants.toLocaleString()} claimants · ${fmtUsd(airdrop.dropped_usd)} dropped`)}&accent=amber`,
        caption: `${airdrop.sell_pressure_7d_pct}% ${airdrop.token} 7-day sell-through`,
      };
    }
    const signal = data.signal as { strength: number; type: string } | undefined;
    if (signal) {
      return {
        url: `/api/og/truth-card?stat=${Math.round(signal.strength * 100)}%25&label=${encodeURIComponent(`${signal.type.replace(/_/g, " ")} signal strength on ${projectName}`)}&project=${encodeURIComponent(projectName)}&accent=blue`,
        caption: `${projectName} signal card`,
      };
    }
    const pattern = data.pattern as { base_rate: number; name: string } | undefined;
    if (pattern) {
      return {
        url: `/api/og/truth-card?stat=${Math.round(pattern.base_rate * 100)}%25&label=${encodeURIComponent(`historical base rate of the ${pattern.name} pattern`)}&project=${encodeURIComponent("CIF Pattern Engine")}&accent=blue`,
        caption: `${pattern.name} base rate`,
      };
    }
    return null;
  }, [ctx]);

  const activeTemplate = templates.find((t) => t.id === templateId);

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col p-4 lg:p-6">
      <PageBanner img="/media/page-studio.png" alt="INTENT — Research In. Citations Out." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-intent-teal" /> {t("studio.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("studio.sub")}</p>
        </div>
        <Badge variant={plan === "ultimate" ? "default" : plan === "pro" ? "amber" : "muted"} className="gap-1.5">
          {plan !== "free" ? <Crown className="h-3 w-3" /> : null}
          {plan !== "free"
            ? `${plan.toUpperCase()} · unlimited generations`
            : usage
              ? `FREE · ${Math.min(usage.today, usage.limit)}/${usage.limit} generations today`
              : "FREE plan"}
        </Badge>
        <div className="flex items-center gap-2">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMobile && (
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-white/5 p-1">
          {(["data", "editor"] as const).map((k) => (
            <button key={k} className={`rounded-md py-1.5 text-xs font-medium ${mobileTab === k ? "bg-intent-teal text-white" : "text-muted-foreground"}`} onClick={() => setMobileTab(k)}>
              {k === "data" ? t("studio.data") : t("studio.editor")}
            </button>
          ))}
        </div>
      )}
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        {/* ══ LEFT: DATA PREVIEW ══ */}
        <Card className={cn("flex flex-col", isMobile && mobileTab !== "data" && "hidden")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-intent-teal" /> Data preview — the evidence behind the content
            </CardTitle>
            <Tabs value={sourceType} onValueChange={(v) => {
              const t = v as SourceType;
              setSourceType(t);
              const next = t === "airdrop" ? sources.airdrops[0]?.id : t === "signal" ? sources.signals[0]?.id : sources.patterns[0]?.id;
              setSourceId(next ?? "");
            }}>
              <TabsList className="mt-2 w-full justify-start">
                <TabsTrigger value="airdrop">Airdrops</TabsTrigger>
                <TabsTrigger value="signal">Signals</TabsTrigger>
                <TabsTrigger value="pattern">Patterns</TabsTrigger>
              </TabsList>
              <TabsContent value={sourceType} className="mt-3">
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger><SelectValue placeholder={t("st.selectSource")} /></SelectTrigger>
                  <SelectContent>
                    {(sourceType === "airdrop" ? sources.airdrops.map((a) => ({ id: a.id, name: `${a.name} (${a.token})`, locked: a.locked }))
                      : sourceType === "signal" ? sources.signals.map((s) => ({ id: s.id, name: s.name, locked: s.locked }))
                      : sources.patterns.map((p) => ({ id: p.id, name: p.name, locked: false }))
                    ).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="flex items-center gap-1.5">{o.locked && <Lock className="h-3 w-3 text-intent-gold" />}{o.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {ctxLoading && <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>}
            {ctxError && <div className="rounded-md border border-intent-rose/30 bg-intent-rose/10 p-3 text-sm text-intent-rose">{ctxError}</div>}
            {ctx && !ctxLoading && <DataPreview ctx={ctx} />}
          </CardContent>
          <div className="border-t border-white/5 p-4">
            <Button className="w-full" size="lg" onClick={generate} disabled={generating || !sourceId}>
              {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {generating ? "Streaming draft…" : `Generate ${activeTemplate?.name ?? "content"}`}
            </Button>
            {genError && <div className="mt-2 rounded-md border border-intent-rose/30 bg-intent-rose/10 p-2 text-xs text-intent-rose">{genError}</div>}
            {activeTemplate && (
              <div className="mono mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                structure: {activeTemplate.structure.map((s) => <span key={s} className="rounded bg-white/5 px-1.5 py-0.5">{s}</span>)}
              </div>
            )}
          </div>
        </Card>

        {/* ══ RIGHT: DRAFT EDITOR ══ */}
        <Card className={cn("flex flex-col", isMobile && mobileTab !== "editor" && "hidden")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-intent-gold" /> Draft editor
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={generating || !sourceId} onClick={generate} title="Regenerate with current tone/template">
                  <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} /> Regenerate
                </Button>
              </span>
              <span className="flex items-center gap-2">
                {generating && <Badge variant="default"><Loader2 className="h-3 w-3 animate-spin" /> AI writing…</Badge>}
                {shareUrl && <Badge variant="success">Published · Powered by INTENT</Badge>}
                {savedId && !shareUrl && <Badge variant="muted">{t("st.savedDraft")}</Badge>}
              </span>
            </CardTitle>
            <CardDescription>Notion-style markdown editing. The AI writes, you steer.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1" data-color-mode="dark">
            <MDEditor
              value={content}
              onChange={(v) => setContent(v ?? "")}
              height={420}
              preview="edit"
              visibleDragbar={false}
              textareaProps={{ placeholder: "Your draft will stream in here. Pick a source on the left and hit Generate…" }}
            />
          </CardContent>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 p-4">
            <Button variant="secondary" onClick={async () => { const id = await saveDraft(); if (id) flash("Draft saved."); }} disabled={!content}>
              <Save /> Save
            </Button>
            <Button variant="secondary" onClick={copyToClipboard} disabled={!content}>
              {copied ? <Check className="text-intent-lime" /> : <Copy />} Copy to clipboard
            </Button>
            <Button variant="outline" onClick={directPost} disabled={!content} title="X OAuth backend is a placeholder — UI fully wired">
              <Send /> Direct Post
            </Button>
            {truthCard && (
              <a href={truthCard.url} target="_blank" rel="noreferrer" download={`truth-card-${Date.now()}.png`}>
                <Button variant="outline"><ImageIcon /> Truth Card</Button>
              </a>
            )}
            {shareUrl && (
              <a href={shareUrl} target="_blank" rel="noreferrer" className="ml-auto">
                <Button variant="link" className="text-intent-teal"><ExternalLink /> {shareUrl.replace("https://", "")}</Button>
              </a>
            )}
          </div>
        </Card>
      </div>

      {/* Recent drafts */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4 text-muted-foreground" /> Recent drafts</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No drafts yet — generate your first piece above.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {drafts.slice(0, 6).map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setContent(d.content); setSavedId(d.id); setShareUrl(d.shareUrl); setOriginal(d.content); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={cn("panel panel-hover p-3 text-left", savedId === d.id && "ring-1 ring-inset ring-intent-teal/50")}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={d.status === "published" ? "success" : "muted"}>{d.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(d.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{d.content.replace(/[#*`>|]/g, "").slice(0, 180)}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-intent-teal/40 bg-intent-surface px-4 py-2.5 text-sm shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Data preview renderer ─────────────────────────────────────────────── */
function DataPreview({ ctx }: { ctx: Record<string, unknown> }) {
  const { t } = useI18n();
  const data = (ctx.data ?? {}) as Record<string, never> & {
    project?: { name: string; category: string; tvl_usd: number; volume_24h_usd: number; sentiment: number };
    airdrop?: { token: string; dropped_usd: number; claimants: number; claim_rate_pct: number; sell_pressure_7d_pct: number; sybil_pct: number } | null;
    pov_matrix?: { segment: string; allocation_pct: number; sold_7d_pct: number; sold_30d_pct: number; holding_pct: number; avg_claim_usd: number }[];
    decision_events?: { title: string; kind: string; occurred_at: string; probability: number }[];
    active_patterns?: string[];
    knowledge_sample?: { statement: string; confidence: number; source: string }[];
    signal?: { type: string; strength: number; detected_at: string; payload: Record<string, unknown> };
    trend_30d?: { tvl_change_pct: number; volume_change_pct: number; sentiment_delta: number };
    pattern?: { name: string; base_rate: number; description: string; typical_impact: { tvl: number; sentiment: number; volume: number } };
    currently_affected_projects?: { name: string; activation: number; category: string }[];
    knowledge?: { statement: string; source: string; confidence: number; tags: string[] };
  };

  const stat = (label: string, value: string, accent = false) => (
    <div className="rounded-md bg-white/5 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mono mt-0.5 text-sm font-bold", accent && "text-intent-gold")}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4 text-sm">
      {data.project && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {stat("Category", data.project.category)}
          {stat("TVL", fmtUsd(data.project.tvl_usd))}
          {stat("Volume 24h", fmtUsd(data.project.volume_24h_usd))}
          {stat("Sentiment", data.project.sentiment.toFixed(2), data.project.sentiment > 0.2)}
        </div>
      )}

      {data.airdrop && (
        <>
          <div className="flex items-center justify-between rounded-md border border-intent-gold/30 bg-intent-gold/5 p-3">
            <div>
              <div className="mono text-2xl font-extrabold text-intent-gold">{data.airdrop.sell_pressure_7d_pct}%</div>
              <div className="text-xs text-muted-foreground">of {data.airdrop.token} recipients sold within 7 days</div>
            </div>
            <div className="mono text-right text-[11px] text-muted-foreground">
              {fmtUsd(data.airdrop.dropped_usd)} dropped<br />
              {data.airdrop.claimants.toLocaleString()} claimants · {data.airdrop.claim_rate_pct}% claimed<br />
              sybil share {data.airdrop.sybil_pct}%
            </div>
          </div>
          {data.pov_matrix && data.pov_matrix.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">POV Matrix — segment behavior</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">Segment</th>
                      <th className="py-1.5 pr-2 font-medium">Alloc</th>
                      <th className="py-1.5 pr-2 font-medium">Sold 7d</th>
                      <th className="py-1.5 pr-2 font-medium">Sold 30d</th>
                      <th className="py-1.5 font-medium">Holding</th>
                    </tr>
                  </thead>
                  <tbody className="mono">
                    {data.pov_matrix.map((r) => (
                      <tr key={r.segment} className="border-b border-white/5">
                        <td className="py-1.5 pr-2 uppercase">{r.segment}</td>
                        <td className="py-1.5 pr-2">{r.allocation_pct}%</td>
                        <td className={cn("py-1.5 pr-2", r.sold_7d_pct > 40 ? "text-intent-rose" : "text-intent-lime")}>{r.sold_7d_pct}%</td>
                        <td className="py-1.5 pr-2 text-muted-foreground">{r.sold_30d_pct}%</td>
                        <td className="py-1.5">{r.holding_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PovChart rows={data.pov_matrix} />
            </div>
          )}
        </>
      )}

      {data.decision_events && data.decision_events.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision events (causal)</div>
          <div className="space-y-1">
            {data.decision_events.map((e) => (
              <div key={e.title} className="flex items-center gap-2 text-xs">
                <Badge variant={e.kind === "decision" ? "default" : e.kind === "catalyst" ? "amber" : "success"}>{e.kind}</Badge>
                <span className="flex-1 truncate">{e.title}</span>
                <span className="mono text-muted-foreground">p={e.probability.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.signal && (
        <div className="rounded-md border border-intent-teal/30 bg-intent-teal/5 p-3">
          <div className="mono text-lg font-bold text-intent-teal">{data.signal.type.replace(/_/g, " ")}</div>
          <div className="mono mt-1 text-xs text-muted-foreground">
            strength {(data.signal.strength * 100).toFixed(0)}% · detected {new Date(data.signal.detected_at).toLocaleDateString()}
          </div>
          <pre className="mono mt-2 overflow-x-auto rounded bg-black/30 p-2 text-[10px] text-muted-foreground">{JSON.stringify(data.signal.payload, null, 2)}</pre>
        </div>
      )}

      {data.trend_30d && (
        <div className="grid grid-cols-3 gap-2">
          {stat("TVL 30d", `${data.trend_30d.tvl_change_pct > 0 ? "+" : ""}${data.trend_30d.tvl_change_pct}%`, data.trend_30d.tvl_change_pct > 10)}
          {stat("Volume 30d", `${data.trend_30d.volume_change_pct > 0 ? "+" : ""}${data.trend_30d.volume_change_pct}%`)}
          {stat("Sentiment Δ", `${data.trend_30d.sentiment_delta > 0 ? "+" : ""}${data.trend_30d.sentiment_delta.toFixed(2)}`)}
        </div>
      )}

      {data.pattern && (
        <div className="rounded-md border border-violet-400/30 bg-violet-400/5 p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{data.pattern.name}</div>
            <Badge variant="amber">base rate {(data.pattern.base_rate * 100).toFixed(0)}%</Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{data.pattern.description}</p>
          <div className="mono mt-2 grid grid-cols-3 gap-2 text-[10px]">
            {stat("Typical TVL", `${(data.pattern.typical_impact.tvl * 100).toFixed(0)}%`)}
            {stat("Typical SNT", `${(data.pattern.typical_impact.sentiment * 100).toFixed(0)}%`)}
            {stat("Typical VOL", `${(data.pattern.typical_impact.volume * 100).toFixed(0)}%`)}
          </div>
        </div>
      )}

      {data.currently_affected_projects && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("st.affected")}</div>
          <div className="flex flex-wrap gap-1.5">
            {data.currently_affected_projects.map((p) => (
              <Badge key={p.name} variant="default">{p.name} · {(p.activation * 100).toFixed(0)}%</Badge>
            ))}
          </div>
        </div>
      )}

      {data.active_patterns && data.active_patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.active_patterns.map((p) => <Badge key={p} variant="amber">{p}</Badge>)}
        </div>
      )}

      {data.knowledge && (
        <div className="rounded-md bg-white/5 p-3 text-xs">
          <p className="leading-relaxed">{data.knowledge.statement}</p>
          <div className="mono mt-1.5 text-[10px] text-muted-foreground">source: {data.knowledge.source} · confidence {(data.knowledge.confidence * 100).toFixed(0)}%</div>
        </div>
      )}

      {data.knowledge_sample && data.knowledge_sample.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("st.knowledgeSample")}</div>
          <ul className="space-y-1.5">
            {data.knowledge_sample.map((k) => (
              <li key={k.statement} className="text-xs leading-relaxed text-muted-foreground">
                <span className="mono mr-1.5 rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase">{k.source}</span>
                {k.statement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!data.airdrop && !data.signal && !data.pattern && !data.knowledge && (
        <pre className="mono overflow-x-auto rounded bg-black/30 p-2 text-[10px] text-muted-foreground">{JSON.stringify(ctx.data, null, 2)}</pre>
      )}
    </div>
  );
}

function PovChart({ rows }: { rows: { segment: string; sold_7d_pct: number; holding_pct: number }[] }) {
  return (
    <EChart
      height={160}
      className="mt-2"
      option={{
        animation: false,
        legend: { textStyle: { color: "#8b949e", fontSize: 10 }, top: 0, right: 0 },
        grid: { left: 56, right: 12, top: 26, bottom: 4 },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#1c2129", borderColor: "#2d333b", textStyle: { color: "#e6edf3", fontSize: 11 } },
        xAxis: { type: "value", max: 100, axisLabel: { color: "#8b949e", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
        yAxis: { type: "category", data: rows.map((r) => r.segment.toUpperCase()), axisLabel: { color: "#e6edf3", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d333b" } } },
        series: [
          { name: "Sold 7d", type: "bar", stack: "x", data: rows.map((r) => r.sold_7d_pct), itemStyle: { color: "#FB7185", borderRadius: [0, 0, 0, 0] } },
          { name: "Holding", type: "bar", stack: "x", data: rows.map((r) => r.holding_pct), itemStyle: { color: "#A3E635" } },
        ],
      }}
    />
  );
}
