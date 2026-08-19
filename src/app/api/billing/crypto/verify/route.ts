import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized } from "@/lib/repo-auth";
import { tryAutoVerifyEth, listPayments } from "@/services/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ paymentId: z.string().max(64) });

/** POST — attempt auto-verification (ETH via Etherscan when key present); Solana = manual/admin. */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const own = listPayments(s.uid).find((p) => p.id === parsed.data.paymentId);
  if (!own) return NextResponse.json({ error: "Not your payment" }, { status: 404 });
  const verified = await tryAutoVerifyEth(parsed.data.paymentId);
  return NextResponse.json({
    payment: verified ?? own,
    note: verified ? "confirmed on-chain" : own.chain === "solana" ? "Solana transfers are confirmed manually by an admin (or via webhook)." : "awaiting confirmation",
  });
}
