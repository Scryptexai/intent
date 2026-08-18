import { getStore } from "@/lib/store";
import { mergeCifIntoStore, getCifDataset, cifDossier, type CifProjectDossier } from "@/services/cif-loader";
import { getProjectDetail, type ProjectDetail } from "@/services/project-detail";
import { ProjectDetailModule } from "@/components/project/project-detail-module";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getStore();
  const p = s.projects.find((x) => x.slug === slug || x.id === slug);
  const name = p?.name ?? slug;
  return {
    title: `${name} · Dossier · INTENT`,
    description: `Forensic dossier for ${name}: telemetry 90 hari, pattern aktif, decision events, entity graph, knowledge bersitasi, dan konflik sumber.`,
    openGraph: {
      title: `${name} — Forensic Dossier`,
      description: `Know the intent. Evidence-first dossier for ${name}.`,
      images: [`/api/og/truth-card?project=${encodeURIComponent(name)}&label=Forensic%20Dossier&stat=DOSSIER`],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await mergeCifIntoStore(getStore());
  const { slug } = await params;
  const s = getStore();
  const exists = s.projects.some((p) => p.slug === slug || p.id === slug);

  // SSR-hydration: dossier + locked-data termuat saat HTML di-fetch
  let initialDetail: ProjectDetail | null = null;
  if (exists) {
    try {
      initialDetail = getProjectDetail(slug);
    } catch {
      initialDetail = null;
    }
  }
  let initialCif: CifProjectDossier | null = null;
  try {
    initialCif = cifDossier(await getCifDataset(), slug);
    if (initialCif) {
      initialCif = JSON.parse(
        JSON.stringify(initialCif).replaceAll("CIF Research Dossier", "INTENT Research Dossier").replaceAll('"author":"CIF"', '"author":"INTENT"'),
      );
    }
  } catch {
    initialCif = null;
  }

  return <ProjectDetailModule slug={slug} exists={exists} initialDetail={initialDetail} initialCif={initialCif} />;
}
