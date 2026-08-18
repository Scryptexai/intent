export { appendAudit, listAudit } from "@/lib/repo";
import type { NextRequest } from "next/server";

/** Convenience re-export so routes don't pass ip manually everywhere. */
export function clientIpGuard(req: NextRequest): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}
