import { getStore } from "@/lib/store";
import { mergeCifIntoStore } from "@/services/cif-loader";
import { MorningBrief } from "@/components/shell/morning-brief";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await mergeCifIntoStore(getStore());
  return <MorningBrief />;
}
