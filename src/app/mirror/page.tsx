import { getStore } from "@/lib/store";
import { mergeCifIntoStore } from "@/services/cif-loader";
import { findAnalogProject, type MirrorResult } from "@/services/similarity-engine";
import { MirrorModule } from "@/components/mirror/mirror-module";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "The Mirror · INTENT", description: "Pattern proximity & analog finder over the locked INTENT catalog." };

export const dynamic = "force-dynamic";

export default async function MirrorPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  await mergeCifIntoStore(getStore());
  const sp = await searchParams;
  const s = getStore();
  const heroProjects = s.projects.filter((p) => p.hero).map((p) => ({ id: p.id, name: p.name, slug: p.slug, category: p.category }));
  const valid = sp.projectId && s.projects.some((p) => p.id === sp.projectId || p.slug === sp.projectId);
  const initialProjectId = valid ? sp.projectId! : "p-blur";

  // SSR-hydration: konten langsung termuat saat halaman di-fetch
  const initialMirror: MirrorResult = findAnalogProject(initialProjectId, 3);
  const initialProximity: MirrorResult = findAnalogProject(initialProjectId, 28);

  return (
    <MirrorModule
      heroProjects={heroProjects}
      initialProjectId={initialProjectId}
      initialMirror={initialMirror}
      initialProximity={initialProximity}
    />
  );
}
