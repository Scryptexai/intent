import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { getProjectDetail } from "@/services/project-detail";
import { getCifDataset, cifDossier, mergeCifIntoStore } from "@/services/cif-loader";
import { PrintMemo } from "@/components/project/print-memo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Due-diligence memo · INTENT", robots: "noindex" };

export default async function PrintPage({ params }: { params: Promise<{ slug: string }> }) {
  await mergeCifIntoStore(getStore());
  const { slug } = await params;
  let detail: Awaited<ReturnType<typeof getProjectDetail>>;
  try {
    detail = getProjectDetail(slug);
  } catch {
    notFound();
  }
  const cif = cifDossier(await getCifDataset(), slug);
  return <PrintMemo detail={detail} cif={cif} />;
}
