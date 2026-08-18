import { NextRequest, NextResponse } from "next/server";
import { apiKeyValid } from "@/lib/auth/guard";
import { getStore } from "@/lib/store";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/patterns — locked 16-pattern registry (x-cif-key). */
export async function GET(req: NextRequest) {
  if (!apiKeyValid(req)) return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
  const s = getStore();
  await appendAudit({ actorEmail: "api-key", action: "api.v1.patterns" });
  return NextResponse.json({
    schema: "cif-intent/v1",
    patterns: (s.cif?.patterns ?? []).map((p) => ({
      id: p.id, name: p.nm, triggers: p.triggers, instances: p.instances, confidence: p.confidence,
      analogs: p.analogs, scope: p.scope, prediction: p.pred, watch: p.watch,
    })),
  });
}
