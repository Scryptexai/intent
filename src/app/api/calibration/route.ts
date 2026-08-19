import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listCalibration, addCalibration, requireRole, unauthorized, forbidden, appendAudit } from "@/lib/repo-auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/calibration — public track record of falsifiable calls. */
export async function GET() {
  const calls = await listCalibration();
  const byId = new Map(getStore().projects.map((p) => [p.id, p]));
  const resolved = calls.filter((c) => c.outcome !== "pending");
  const passed = resolved.filter((c) => c.outcome === "pass").length;
  return NextResponse.json({
    calls: calls.map((c) => ({ ...c, projectName: byId.get(c.projectId)?.name ?? "?" })),
    calibrationScore: resolved.length ? Math.round((passed / resolved.length) * 100) / 100 : null,
    resolvedCount: resolved.length,
  });
}

const Body = z.object({
  projectId: z.string().max(64),
  statement: z.string().min(10).max(500),
  triggerCondition: z.string().min(10).max(500),
  patternConfidence: z.number().min(0).max(1),
  trajectoryProbability: z.number().min(0).max(1),
  resolveAfter: z.string().datetime().or(z.string().date()),
});

/** POST /api/calibration — publish a falsifiable Current Read (analyst+). */
export async function POST(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await requireRole(req, "viewer");
    return any ? forbidden() : unauthorized();
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten() }, { status: 400 });
  const row = await addCalibration({
    projectId: parsed.data.projectId,
    statement: parsed.data.statement,
    triggerCondition: parsed.data.triggerCondition,
    patternConfidence: parsed.data.patternConfidence,
    trajectoryProbability: parsed.data.trajectoryProbability,
    asOfDate: new Date().toISOString(),
    resolveAfter: new Date(parsed.data.resolveAfter).toISOString(),
  });
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "calibration.publish", resource: row.id });
  return NextResponse.json({ call: row }, { status: 201 });
}
