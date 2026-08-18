import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateDraft, requireRole, unauthorized, forbidden, appendAudit, getSession } from "@/lib/repo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Direct Post to X — OAuth backend placeholder (UI fully wired).
 * Analyst+; records publish + share url on the owner's draft.
 */
const Body = z.object({ draftId: z.string().max(64), content: z.string().min(1).max(20_000) });

export async function POST(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await getSession(req);
    return any ? forbidden() : unauthorized();
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Real Direct Post when a connected X token exists for this user
  const token = (await import("@/lib/store")).getStore().xTokens.get(s.uid)?.accessToken;
  if (token) {
    try {
      const res = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: parsed.data.content.slice(0, 280 * 10) }),
      });
      const d = await res.json();
      if (res.ok && d?.data?.id) {
        const shareUrl = `https://x.com/i/web/status/${d.data.id}`;
        await updateDraft(parsed.data.draftId, s.uid, { status: "published", shareUrl });
        await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "share.publish", resource: parsed.data.draftId, meta: { simulated: false } });
        return NextResponse.json({ simulated: false, shareUrl });
      }
    } catch {
      /* fall through to simulated */
    }
  }

  const hasOAuth = !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  if (!hasOAuth) {
    const fakeId = Math.floor(Math.random() * 1e18).toString();
    const shareUrl = `https://x.com/cif_operator/status/${fakeId}`;
    const draft = await updateDraft(parsed.data.draftId, s.uid, { status: "published", shareUrl });
    if (!draft) return NextResponse.json({ error: "Draft not found or not owned" }, { status: 404 });
    await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "share.publish", resource: draft.id, meta: { simulated: true } });
    return NextResponse.json({ simulated: true, shareUrl, message: "OAuth placeholder — connect X credentials to enable real Direct Post." });
  }
  return NextResponse.json({ simulated: false, error: "OAuth flow not implemented yet" }, { status: 501 });
}
