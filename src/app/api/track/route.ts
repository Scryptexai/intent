import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ event: z.string().min(2).max(40), meta: z.record(z.unknown()).optional() });

/** POST /api/track — internal value-delivered instrumentation. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  trackEvent(parsed.data.event, parsed.data.meta);
  return NextResponse.json({ ok: true });
}
