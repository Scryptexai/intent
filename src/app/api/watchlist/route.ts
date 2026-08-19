import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWatchlist, toggleWatch, getSession, requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/watchlist — own watchlist with project info. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const store = getStore();
  const byId = new Map(store.projects.map((p) => [p.id, p]));
  const rows = (await getWatchlist(s.uid)).map((w) => ({
    ...w,
    project: byId.get(w.projectId) ? { id: w.projectId, name: byId.get(w.projectId)!.name, slug: byId.get(w.projectId)!.slug, category: byId.get(w.projectId)!.category } : null,
  }));
  return NextResponse.json({ watchlist: rows });
}

const Body = z.object({
  projectId: z.string().max(64),
  alertTriggers: z
    .object({ sentinel: z.boolean(), airdrop: z.boolean(), pattern_match: z.boolean() })
    .default({ sentinel: true, airdrop: true, pattern_match: true }),
});

/** POST /api/watchlist — analyst+. */
export async function POST(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await getSession(req);
    return any ? forbidden() : unauthorized();
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const row = await toggleWatch(s.uid, parsed.data.projectId, parsed.data.alertTriggers);
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: row ? "watch.add" : "watch.remove", resource: parsed.data.projectId });
  return NextResponse.json({ watching: !!row, row });
}
