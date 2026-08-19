import { ensureScheduler, schedulerStatus } from "@/lib/jobs/scheduler";
import { scanAnomalies, anomalyList, scanLogs } from "@/services/anomaly-detection";
import { getStore } from "@/lib/store";
import { mergeCifIntoStore, getCifDataset, cifStats, supabaseServerStatus } from "@/services/cif-loader";
import { SentinelDashboard } from "@/components/sentinel/sentinel-dashboard";

export const dynamic = "force-dynamic";

export default async function SentinelPage() {
  void ensureScheduler();
  await mergeCifIntoStore(getStore());
  const s = getStore();
  if (anomalyList().length === 0) scanAnomalies(undefined, "manual");
  const cif = await getCifDataset();
  return (
    <SentinelDashboard
      universeSize={s.projects.length}
      watchedCount={s.watchlists.length}
      initialAnomalies={{ anomalies: anomalyList(true), logs: scanLogs(8), scheduler: schedulerStatus() }}
      initialCif={{ stats: cifStats(cif), supabase: await supabaseServerStatus() }}
    />
  );
}
