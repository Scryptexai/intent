import { UniverseClient } from "@/components/shell/universe-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Universe · INTENT", description: "Ranking proyek: skor, momentum, TVL — watchlist & export." };

export default function UniversePage() {
  return <UniverseClient />;
}
