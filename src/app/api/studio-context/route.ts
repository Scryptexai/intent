import { NextRequest, NextResponse } from "next/server";
import { buildContext, type SourceType } from "@/lib/ai/context";

export const runtime = "nodejs";

/** GET /api/studio-context?sourceType=airdrop&sourceId=p-blur — raw data behind a source. */
export async function GET(req: NextRequest) {
  const sourceType = req.nextUrl.searchParams.get("sourceType") as SourceType | null;
  const sourceId = req.nextUrl.searchParams.get("sourceId");
  if (!sourceType || !sourceId) return NextResponse.json({ error: "sourceType & sourceId required" }, { status: 400 });
  const ctx = buildContext(sourceType, sourceId);
  if (!ctx) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  return NextResponse.json(ctx);
}
