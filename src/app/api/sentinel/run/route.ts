import { NextRequest, NextResponse } from "next/server";
import { scanAnomalies } from "@/services/anomaly-detection";
import { ensureScheduler } from "@/lib/jobs/scheduler";
import { ServiceError } from "@/services/logger";
import { cronAuthorized, getSession } from "@/lib/auth/guard";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/sentinel/run?projectId= — cron (Bearer CRON_SECRET) or analyst session. */
export async function POST(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "CRON_SECRET bearer or analyst session required." }, { status: 401 });
  }
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  try {
    const scheduler = await ensureScheduler();
    const result = scanAnomalies(projectId, "manual");
    const s = await getSession(req);
    await appendAudit({ actorId: s?.uid, actorEmail: s?.email ?? "cron", action: "sentinel.run", meta: { newAlerts: result.newAlerts } });
    return NextResponse.json({ result, scheduler });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "SCAN_FAILED" }, { status: 500 });
  }
}
