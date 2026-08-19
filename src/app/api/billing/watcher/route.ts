import { NextRequest, NextResponse } from "next/server";
import { watchPendingPayments } from "@/services/billing/watcher";
import { cronAuthorized } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/billing/watcher — cron (5m) atau session privileged: auto-confirm payments. */
export async function POST(req: NextRequest) {
  if (!(await cronAuthorized(req))) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await watchPendingPayments();
  return NextResponse.json(result);
}
