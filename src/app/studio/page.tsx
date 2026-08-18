import { getStore } from "@/lib/store";
import { mergeCifIntoStore } from "@/services/cif-loader";
import { buildContext, type SourceType } from "@/lib/ai/context";
import { StudioModule } from "@/components/studio/studio-module";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Content Studio · INTENT", description: "AI Content Studio: cited drafts, Truth Cards, share loop." };

export const dynamic = "force-dynamic";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ sourceType?: string; sourceId?: string }> }) {
  await mergeCifIntoStore(getStore());
  const sp = await searchParams;
  const s = getStore();
  const sources = {
    airdrops: s.airdrops.map((a) => {
      const p = s.projects.find((x) => x.id === a.projectId);
      return { id: a.projectId, name: p?.name ?? a.token, token: a.token, locked: p ? !p.isDemo : false };
    }),
    signals: s.signals.map((sig) => {
      const p = s.projects.find((x) => x.id === sig.projectId);
      return { id: sig.id, name: `${p?.name ?? "?"} · ${sig.type.replace(/_/g, " ")}`, projectId: sig.projectId, locked: p ? !p.isDemo : false };
    }),
    patterns: s.patterns.map((p) => ({ id: p.slug, name: p.name })),
  };
  const templates = s.templates.map((t) => ({ id: t.id, name: t.name, description: t.description, structure: t.format.structure }));
  const drafts = s.drafts
    .filter((d) => d.userId === "u-demo")
    .map((d) => ({ id: d.id, templateId: d.templateId, sourceType: d.sourceType, sourceId: d.sourceId, content: d.editedContent ?? d.generatedContent, status: d.status, shareUrl: d.shareUrl, createdAt: d.createdAt }));

  // SSR-hydration: data preview termuat saat HTML di-fetch
  const st = (sp.sourceType as SourceType) || "airdrop";
  const sid = sp.sourceId || "p-blur";
  const initialCtx = buildContext(st, sid) ?? buildContext("airdrop", "p-blur");

  return (
    <StudioModule
      sources={sources}
      templates={templates}
      initialDrafts={drafts}
      initialSourceType={sp.sourceType}
      initialSourceId={sp.sourceId}
      initialCtx={initialCtx as unknown as Record<string, unknown> | null}
    />
  );
}
