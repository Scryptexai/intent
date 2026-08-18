import { getStore } from "@/lib/store";
import { mergeCifIntoStore } from "@/services/cif-loader";
import { getDecisionChain, type ChainNode } from "@/services/decision-chain";
import { MultiverseModule } from "@/components/multiverse/multiverse-module";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "The Multiverse · INTENT", description: "Causal decision chains & counter-factual branches." };

export const dynamic = "force-dynamic";

export default async function MultiversePage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  await mergeCifIntoStore(getStore());
  const sp = await searchParams;
  const s = getStore();
  const treeProjects = [...new Set(s.events.map((e) => e.projectId))]
    .map((id) => s.projects.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, name: p!.name, slug: p!.slug, category: p!.category }));
  const valid = sp.projectId && treeProjects.some((p) => p.id === sp.projectId);
  const initialProjectId = valid ? sp.projectId! : treeProjects[0]?.id ?? "";

  let initialChain: { nodes: ChainNode[]; edges: { id: string; source: string; target: string; probability: number; counterFactual: boolean }[] } = { nodes: [], edges: [] };
  try {
    initialChain = getDecisionChain(initialProjectId);
  } catch {
    initialChain = { nodes: [], edges: [] };
  }

  return <MultiverseModule projects={treeProjects} initialProjectId={initialProjectId} initialChain={initialChain} dataSource={process.env.DATABASE_URL ? "db" : "demo"} />;
}
