import { NextRequest, NextResponse } from "next/server";
import { apiKeyValid } from "@/lib/auth/guard";
import { getStore } from "@/lib/store";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/projects — programmatic catalog API (x-cif-key, scope: read).
 * Enterprise API surface; see docs/API.md.
 */
export async function GET(req: NextRequest) {
  if (!apiKeyValid(req)) {
    return NextResponse.json({ error: "INVALID_API_KEY", message: "Provide x-cif-key header." }, { status: 401 });
  }
  const s = getStore();
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));
  await appendAudit({ actorEmail: "api-key", action: "api.v1.projects", meta: { limit } });
  return NextResponse.json({
    schema: "cif-intent/v1",
    projects: s.projects.slice(0, limit).map((p) => ({
      slug: p.slug, name: p.name, category: p.category, era: p.description, tvlUsd: p.tvlUsd, volume24hUsd: p.volume24hUsd, sentiment: p.sentiment,
    })),
  });
}
