import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: s.uid, email: s.email, role: s.role, plan: s.plan } });
}
