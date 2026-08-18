import type { Metadata } from "next";
import { BriefClient } from "@/components/shell/brief-client";
import { getStore } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getStore();
  const p = s.projects.find((x) => x.slug === slug || x.id === slug);
  const name = p?.name ?? slug;
  return {
    title: `${name} · Decision Brief · INTENT`,
    description: `Premium decision brief for ${name}: calibrated read (evidence quality, pattern confidence, trajectory uncertainty), evidence ledger, historical analogs, red team & decision gates.`,
    openGraph: {
      title: `${name} — Decision Brief`,
      description: `Make decisions you can defend. Calibrated read + evidence ledger for ${name}.`,
      images: [`/api/og/truth-card?project=${encodeURIComponent(name)}&label=Decision%20Brief&stat=PC%2BTP`],
    },
  };
}

export default async function BriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BriefClient slug={slug} />;
}
