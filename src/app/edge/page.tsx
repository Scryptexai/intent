import { getStore } from "@/lib/store";
import { SIM_VARIABLES, listSimulations } from "@/services/simulator";
import { EdgeModule } from "@/components/edge/edge-module";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "The Edge · INTENT", description: "Probabilistic counter-factual simulator (Pro)." };

export const dynamic = "force-dynamic";

export default function EdgePage() {
  const s = getStore();
  const projects = s.projects.filter((p) => p.hero).map((p) => ({ id: p.id, name: p.name, category: p.category, slug: p.slug }));
  return (
    <EdgeModule
      projects={projects}
      initialVariables={{ variables: SIM_VARIABLES }}
      initialSaved={{ simulations: listSimulations("p-blur") }}
    />
  );
}
