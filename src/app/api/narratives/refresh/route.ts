import { NextRequest, NextResponse } from "next/server";
import { refreshTruthMatrix } from "@/services/truth-matrix";
import { cronAuthorized } from "@/lib/auth/guard";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/narratives/refresh — cron-only (24h) truth-matrix drift refresh. */
export async function POST(req: NextRequest) {
  if (!(await cronAuthorized(req))) {
    return NextResponse.json({ error: "CRON_AUTH_REQUIRED" }, { status: 401 });
  }
  const result = refreshTruthMatrix();
  await appendAudit({ action: "truth.refresh", meta: result });
  return NextResponse.json(result);
}
