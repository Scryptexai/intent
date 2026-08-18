import { NextRequest, NextResponse } from "next/server";
import { getStore, listAlerts } from "@/lib/store";
import { schedulerStatus } from "@/lib/jobs/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sentinel?unresolved=1 — list Sentinel exceptions. */
export async function GET(req: NextRequest) {
  const unresolved = req.nextUrl.searchParams.get("unresolved") === "1";
  const s = getStore();
  const byId = new Map(s.projects.map((p) => [p.id, p]));
  const watched = new Set(s.watchlists.map((w) => w.projectId));
  const alerts = listAlerts({ unresolvedOnly: unresolved }).map((a) => ({
    ...a,
    project: byId.get(a.projectId)
      ? { id: a.projectId, name: byId.get(a.projectId)!.name, slug: byId.get(a.projectId)!.slug, category: byId.get(a.projectId)!.category }
      : null,
    watched: watched.has(a.projectId),
  }));
  return NextResponse.json({ alerts, scheduler: schedulerStatus() });
}
