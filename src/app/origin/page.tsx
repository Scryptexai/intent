import { actorReports } from "@/services/actor-credibility";
import { getTruthMatrix, topGapNarratives } from "@/services/truth-matrix";
import { OriginModule } from "@/components/origin/origin-module";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "The Origin · INTENT", description: "Actor credibility ledger & Narrative Truth Matrix." };

export const dynamic = "force-dynamic";

export default function OriginPage() {
  // SSR-hydration: ledger + matrix termuat saat HTML di-fetch
  const actors = actorReports().map((r) => ({
    id: r.entity.id,
    name: r.entity.name,
    kind: r.entity.kind,
    credibilityScore: r.entity.credibilityScore,
    reliability: r.reliability,
    hitRate: r.hitRate,
    resolvedCalls: r.resolvedCalls,
    pendingCalls: r.pendingCalls,
    flags: r.flags,
  }));
  const matrix = getTruthMatrix();
  return (
    <OriginModule
      initialActors={{ actors }}
      initialMatrix={{ matrix, gaps: topGapNarratives(3) }}
    />
  );
}
