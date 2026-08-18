"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { PageBanner } from "@/components/shell/promo-surfaces";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { type Edge, type Node, Position, type NodeMouseHandler, useNodesState, useEdgesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { GitBranch, Plus, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/utils";
import { emitUnauthorized } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import type { ChainNode } from "@/services/decision-chain";

interface Props {
  projects: { id: string; name: string; slug: string; category: string }[];
  initialProjectId: string;
  dataSource: "db" | "demo";
  initialChain: { nodes: ChainNode[]; edges: { id: string; source: string; target: string; probability: number; counterFactual: boolean }[] };
}

const KIND_COLOR: Record<string, string> = { decision: "#F59E0B", outcome: "#A3E635", catalyst: "#2DD4BF" };

export function MultiverseModule({ projects, initialProjectId, initialChain, dataSource }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [selectedNode, setSelectedNode] = useState<ChainNode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newParent, setNewParent] = useState<string>("");
  const [newProb, setNewProb] = useState(0.3);

  useEffect(() => setProjectId(initialProjectId), [initialProjectId]);

  const chain = useQuery<{ nodes: ChainNode[]; edges: { id: string; source: string; target: string; probability: number; counterFactual: boolean }[]; criticalPath?: { title: string; line: string } | null }>({
    queryKey: ["chain", projectId],
    enabled: !!projectId,
    initialData: projectId === initialProjectId ? initialChain : undefined,
    queryFn: async () => {
      const res = await fetch(`/api/multiverse?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "chain failed");
      return res.json();
    },
  });

  const addBranch = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/multiverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, parentId: newParent || null, title: newTitle, probability: newProb }),
      });
      if (res.status === 401) emitUnauthorized();
      if (!res.ok) throw new Error("branch failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chain", projectId] });
      setAddOpen(false);
      setNewTitle("");
    },
  });

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      const n = chain.data?.nodes.find((x) => x.id === node.id);
      if (n) setSelectedNode(n);
    },
    [chain.data],
  );

  const computed = useMemo(() => {
    const events = chain.data?.nodes ?? [];
    // BFS depth → layout
    const depth = new Map<string, number>();
    const roots = events.filter((e) => !e.parentId || !events.some((x) => x.id === e.parentId));
    const queue = roots.map((r) => ({ id: r.id, d: 0 }));
    while (queue.length) {
      const { id, d } = queue.shift()!;
      if (depth.has(id)) continue;
      depth.set(id, d);
      events.filter((e) => e.parentId === id).forEach((c) => queue.push({ id: c.id, d: d + 1 }));
    }
    const byDepth = new Map<number, string[]>();
    events.forEach((e) => {
      const d = depth.get(e.id) ?? 0;
      byDepth.set(d, [...(byDepth.get(d) ?? []), e.id]);
    });

    const nodes: Node[] = events.map((e) => {
      const d = depth.get(e.id) ?? 0;
      const siblings = byDepth.get(d) ?? [e.id];
      const idx = siblings.indexOf(e.id);
      // Spec shapes: decision = diamond (amber), event/catalyst = rectangle (blue/violet), outcome = circle (green/red)
      const isDecision = e.kind === "decision";
      const isOutcome = e.kind === "outcome";
      const color = e.kind === "catalyst" ? KIND_COLOR.catalyst : isDecision ? KIND_COLOR.decision : e.impact.tvl >= 0 ? KIND_COLOR.outcome : "#FB7185";
      const shapeClass = isDecision
        ? "rotate-45 rounded-md border-2"
        : isOutcome
          ? "rounded-full border-2"
          : "rounded-lg border-2";
      return {
        id: e.id,
        position: { x: d * 300, y: idx * 150 - (siblings.length - 1) * 70 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className={shapeClass} style={{ borderColor: color, background: "#161B22", width: isOutcome ? 120 : 190, height: isOutcome ? 120 : 86, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${color}33` }}>
              <div className={isDecision ? "-rotate-45 px-2 text-center" : "px-3 text-center"}>
                <div className="mono text-[8px] font-bold uppercase tracking-widest" style={{ color }}>{e.kind}{e.counterFactual ? " · CF" : ""}</div>
                <div className="mt-0.5 text-[10px] font-medium leading-tight text-foreground line-clamp-3">{e.title}</div>
              </div>
            </div>
          ),
        },
      };
    });

    const edges: Edge[] = (chain.data?.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.counterFactual,
      style: { stroke: e.counterFactual ? "#F59E0B" : "#2DD4BF", strokeWidth: 1.5, strokeDasharray: e.counterFactual ? "6 4" : undefined },
      label: e.counterFactual ? `CF ${(e.probability * 100).toFixed(0)}%` : `${(e.probability * 100).toFixed(0)}%`,
      labelStyle: { fill: "#8b949e", fontSize: 10 },
      labelBgStyle: { fill: "#0B0E11" },
    }));

    return { nodes, edges };
  }, [chain.data]);

  // spec: useNodesState / useEdgesState dengan initial state dari API
  const [nodes, setNodes, onNodesChange] = useNodesState(computed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computed.edges);
  useEffect(() => {
    setNodes(computed.nodes);
    setEdges(computed.edges);
  }, [computed, setNodes, setEdges]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="grid-bg flex min-h-[calc(100vh-3.5rem)] flex-col p-4 lg:p-8">
      <PageBanner img="/media/page-multiverse.png" alt="INTENT — Every Decision Has Branches." />
      {/* header + controls */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GitBranch className="h-6 w-6 text-intent-teal" /> The Multiverse
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("mv.what.body")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted" className="mono">{dataSource === "db" ? t("mv.source.db") : t("mv.source.demo")}</Badge>
          <div className="w-64">
            <Select value={projectId} onValueChange={(v) => { setProjectId(v); router.replace(`/multiverse?projectId=${v}`); }}>
              <SelectTrigger><SelectValue placeholder={t("mv.select")} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> {t("mv.add")}
          </Button>
        </div>
      </div>

      {/* explainer: cara pakai + legenda — biar fungsi halaman langsung jelas */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="panel p-4">
          <div className="eyebrow">{t("mv.what.title")}</div>
          <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li><span className="mono text-intent-gold">1.</span> {t("mv.how1")}</li>
            <li><span className="mono text-intent-gold">2.</span> {t("mv.how2")}</li>
            <li><span className="mono text-intent-gold">3.</span> {t("mv.how3")}</li>
          </ol>
        </div>
        <div className="panel p-4">
          <div className="eyebrow">{t("mv.legend.title")}</div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rotate-45 rounded-[3px] border-2 border-intent-gold bg-intent-surface" /> decision</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-[3px] border-2 border-intent-teal bg-intent-surface" /> catalyst</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-intent-lime bg-intent-surface" /> outcome +</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-intent-rose bg-intent-surface" /> outcome −</span>
          </div>
        </div>
        <div className="panel p-4">
          <div className="eyebrow">Edges</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("mv.legend.edge")}</p>
          <p className="mono mt-2 text-[10px] text-muted-foreground">{nodes.length} nodes · {edges.length} edges</p>
        </div>
      </div>

      {chain.data?.criticalPath && (
        <div className="mb-4 rounded-xl border border-intent-gold/30 bg-intent-gold/5 p-4 text-sm">
          <span className="eyebrow text-intent-gold">{t("mv.critical")}</span>
          <p className="mt-1 text-foreground/90">{chain.data.criticalPath.line}</p>
        </div>
      )}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{project?.name} — decision chain</CardTitle>
          <CardDescription>{t("mv.card.sub")}</CardDescription>
        </CardHeader>
        <CardContent className="relative h-[540px] p-0">
          {chain.isLoading ? (
            <Skeleton className="h-full" />
          ) : nodes.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">{t("mv.empty")}</div>
          ) : (
            <FlowCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} height={540} />
          )}

          {/* Node dossier side panel */}
          {selectedNode && (
            <div className="absolute right-3 top-3 z-10 w-72 panel p-4 shadow-2xl">
              <div className="flex items-start justify-between">
                <Badge variant={selectedNode.kind === "decision" ? "amber" : selectedNode.kind === "catalyst" ? "default" : "success"}>{selectedNode.kind}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}><X className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="mt-2 text-sm font-semibold leading-snug">{selectedNode.title}</div>
              <div className="mono mt-2 text-[10px] text-muted-foreground">
                {fmtDate(selectedNode.occurredAt)} · p={selectedNode.probability.toFixed(2)}
                {selectedNode.counterFactual && <span className="text-intent-gold"> · counter-factual branch</span>}
              </div>
              <div className="mono mt-2 grid grid-cols-3 gap-1 text-[10px]">
                <span className={selectedNode.impact.tvl >= 0 ? "text-intent-lime" : "text-intent-rose"}>TVL {(selectedNode.impact.tvl * 100).toFixed(0)}%</span>
                <span className={selectedNode.impact.sentiment >= 0 ? "text-intent-lime" : "text-intent-rose"}>SNT {(selectedNode.impact.sentiment * 100).toFixed(0)}%</span>
                <span className={selectedNode.impact.volume >= 0 ? "text-intent-lime" : "text-intent-rose"}>VOL {(selectedNode.impact.volume * 100).toFixed(0)}%</span>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => router.push(`/project/${project?.slug}`)}>
                <ExternalLink className="h-3 w-3" /> {t("mv.dossier")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Branch dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mv.dialog.title")}</DialogTitle>
            <DialogDescription>{project?.name} — {t("mv.dialog.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{t("mv.dialog.parent")}</div>
              <Select value={newParent || (chain.data?.nodes[0]?.id ?? "")} onValueChange={setNewParent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(chain.data?.nodes ?? []).map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.title.slice(0, 48)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{t("mv.dialog.titlefield")}</div>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder='e.g. "Counter-factual: sybil screen applied"' />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{t("mv.dialog.prob")}</div>
              <Input type="number" min={0.05} max={0.95} step={0.05} value={newProb} onChange={(e) => setNewProb(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t("mv.cancel")}</Button>
            <Button disabled={!newTitle || addBranch.isPending} onClick={() => addBranch.mutate()}>
              <Plus /> {t("mv.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
