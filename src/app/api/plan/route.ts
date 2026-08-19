import { NextRequest, NextResponse } from "next/server";
import { getUserById, generationsUsedToday, getSession, appendAudit } from "@/lib/repo-auth";
import { FREE_GENERATION_LIMIT } from "@/services/content-generator";
import { effectivePlan, getSubscription } from "@/services/billing";
import { atLeast } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/plan — session-aware plan + quota (anonymous = free/viewer). */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) {
    return NextResponse.json({ user: null, usage: { today: 0, limit: FREE_GENERATION_LIMIT } });
  }
  const user = await getUserById(s.uid);
  const plan = effectivePlan(s.uid);
  const sub = getSubscription(s.uid);
  return NextResponse.json({
    user: user ? { id: user.id, email: user.email, name: user.name, plan, role: user.role, trialEndsAt: sub.trialEndsAt, subStatus: sub.status } : null,
    usage: { today: await generationsUsedToday(s.uid), limit: atLeast(plan, "pro") ? 100000 : FREE_GENERATION_LIMIT },
  });
}

/** POST /api/plan — simulated checkout (self-upgrade; audit logged). */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const plan = body?.plan === "ultimate" ? "ultimate" : body?.plan === "pro" ? "pro" : "free";
  // memory-mode users mutate in store; DB mode would update users row
  const { getStore } = await import("@/lib/store");
  const u = getStore().users.find((x) => x.id === s.uid);
  if (u) u.plan = plan;
  // simulated checkout → aktivasi subscription konsisten dgn tier (payment-driven model)
  if (plan !== "free") {
    const { activatePaid, getSubscription } = await import("@/services/billing");
    const sub = getSubscription(s.uid);
    activatePaid(s.uid, sub.provider ?? "simulated", plan);
  }
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "plan.change", meta: { plan } });
  return NextResponse.json({ user: { id: s.uid, email: s.email, plan } });
}
