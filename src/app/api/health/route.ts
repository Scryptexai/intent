import { NextResponse } from "next/server";
import { isDbMode } from "@/lib/repo";
import { supabaseServerStatus } from "@/services/cif-loader";
import { schedulerStatus } from "@/lib/jobs/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — ops probe (no secrets). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    version: process.env.npm_package_version ?? "0.2.0",
    persistence: isDbMode() ? "postgres" : "memory",
    supabase: await supabaseServerStatus(),
    scheduler: schedulerStatus(),
    time: new Date().toISOString(),
  });
}
