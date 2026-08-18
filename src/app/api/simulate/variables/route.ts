import { NextRequest, NextResponse } from "next/server";
import { SIM_VARIABLES } from "@/services/simulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/simulate/variables?projectId= — slider definitions. */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ variables: SIM_VARIABLES });
}
