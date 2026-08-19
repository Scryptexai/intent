import { NextResponse } from "next/server";
import { SIM_VARIABLES } from "@/services/simulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/edge/variables — slider definitions for the sandbox. */
export async function GET() {
  return NextResponse.json({ variables: SIM_VARIABLES });
}
