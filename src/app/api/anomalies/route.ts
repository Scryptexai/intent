import { NextRequest, NextResponse } from "next/server";
import { anomalyList, scanAnomalies } from "@/services/anomaly-detection";
import { translateAnomalyImpact } from "@/services/value-translation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/anomalies?projectId&severity&limit — with impact translation. */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const severity = req.nextUrl.searchParams.get("severity"); // all|high|medium
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));

  if (anomalyList().length === 0) scanAnomalies(undefined, "manual");
  let rows = anomalyList(true).map((a) => ({
    ...a,
    impactTranslation: translateAnomalyImpact(a.metric, a.anomalyScore, a.direction),
  }));
  if (projectId) rows = rows.filter((a) => a.projectId === projectId || a.projectSlug === projectId);
  if (severity === "high") rows = rows.filter((a) => a.anomalyScore >= 3);
  if (severity === "medium") rows = rows.filter((a) => a.anomalyScore >= 2 && a.anomalyScore < 3);

  return NextResponse.json({ anomalies: rows.slice(0, limit), total: rows.length });
}
