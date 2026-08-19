import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDraft, listDrafts } from "@/lib/repo";
import { getSession, requireRole, unauthorized, forbidden } from "@/lib/auth/guard";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONTENT = 20_000;

/** GET /api/drafts — own drafts (any signed-in role). */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  return NextResponse.json({ drafts: await listDrafts(s.uid) });
}

const CreateBody = z.object({
  sourceType: z.enum(["airdrop", "signal", "knowledge", "pattern"]),
  sourceId: z.string().max(64),
  templateId: z.string().max(64),
  generatedContent: z.string().max(MAX_CONTENT),
  editedContent: z.string().max(MAX_CONTENT).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

/** POST /api/drafts — analyst+. */
export async function POST(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await getSession(req);
    return any ? forbidden() : unauthorized();
  }
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const d = parsed.data;
  const draft = await createDraft({
    userId: s.uid,
    sourceType: d.sourceType,
    sourceId: d.sourceId,
    templateId: d.templateId,
    generatedContent: d.generatedContent,
    editedContent: d.editedContent ?? null,
    status: d.status,
  });
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "draft.create", resource: draft.id });
  return NextResponse.json({ draft }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().max(64),
  editedContent: z.string().max(MAX_CONTENT).optional(),
  status: z.enum(["draft", "published"]).optional(),
  shareUrl: z.string().url().max(500).optional(),
});

/** PATCH /api/drafts — owner only (repo enforces), analyst+. */
export async function PATCH(req: NextRequest) {
  const s = await requireRole(req, "analyst");
  if (!s) {
    const any = await getSession(req);
    return any ? forbidden() : unauthorized();
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { id, ...patch } = parsed.data;
  const draft = await (await import("@/lib/repo")).updateDraft(id, s.uid, patch);
  if (!draft) return NextResponse.json({ error: "Draft not found or not owned" }, { status: 404 });
  await appendAudit({ actorId: s.uid, actorEmail: s.email, action: "draft.update", resource: id });
  return NextResponse.json({ draft });
}
