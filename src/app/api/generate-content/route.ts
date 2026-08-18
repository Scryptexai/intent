import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prepareGeneration, composeLocal, createLocalStream } from "@/services/content-generator";
import { ServiceError, logger } from "@/services/logger";
import { getSession, unauthorized } from "@/lib/auth/guard";
import { effectivePlan } from "@/services/billing";
import { appendAudit } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  sourceType: z.enum(["airdrop", "signal", "knowledge", "pattern"]),
  sourceId: z.string().min(1).max(64),
  templateId: z.string().min(1).max(64),
  tone: z.enum(["professional", "casual", "controversial"]).default("professional"),
});

/**
 * MODULE 6 — AI Content Studio generator (auth required).
 * Streams: OPENAI_API_KEY → Vercel AI SDK streamText; else local composer.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { sourceType, sourceId, templateId, tone } = parsed.data;

  try {
    const prep = await prepareGeneration({ sourceType, sourceId, templateId, tone }, { id: session.uid, plan: effectivePlan(session.uid) });
    await appendAudit({ actorId: session.uid, actorEmail: session.email, action: "studio.generate", resource: `${sourceType}:${sourceId}`, meta: { template: templateId, tone } });

    if (process.env.OPENAI_API_KEY) {
      const { openai } = await import("@ai-sdk/openai");
      const { streamText } = await import("ai");
      const result = await streamText({
        model: openai(process.env.CIF_MODEL || "gpt-4o-mini"),
        system: prep.systemPrompt,
        prompt: `Dataset (JSON):\n${prep.dataJson}\n\nTone: ${tone}.\nWrite the content now, following your system instructions exactly.`,
        temperature: tone === "controversial" ? 0.9 : 0.7,
      });
      return result.toTextStreamResponse({ headers: { "x-cif-source": "openai", "x-cif-context": prep.headerTitle } });
    }

    const draft = composeLocal(prep.ctx, templateId, tone);
    return new Response(createLocalStream(draft), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "x-cif-source": "local-composer", "x-cif-context": prep.headerTitle },
    });
  } catch (e) {
    if (e instanceof ServiceError) {
      logger.warn("studio", "generation rejected", { code: e.code });
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    }
    logger.error("studio", "generation failed", { error: String(e) });
    return NextResponse.json({ error: "GENERATION_FAILED", message: String(e) }, { status: 500 });
  }
}
