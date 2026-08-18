import { buildContext, type SourceType, type StudioContext } from "@/lib/ai/context";
import { composeDraft, type Tone } from "@/lib/ai/composer";
import { generationsUsedToday, recordGeneration } from "@/lib/repo";
import { getStore } from "@/lib/store";
import { logger, ServiceError } from "@/services/logger";

/**
 * ── CONTENT STUDIO · Content Generator (enterprise, user-scoped) ───────────
 * Fetch source data → structured JSON → template system prompt → stream.
 * Quota & gating are evaluated per authenticated user (repo-backed so it is
 * consistent across serverless instances when a DB is configured).
 */

export const FREE_GENERATION_LIMIT = 3;

export interface GenerationRequest {
  sourceType: SourceType;
  sourceId: string;
  templateId: string;
  tone: Tone;
}

export interface PreparedGeneration {
  ctx: StudioContext;
  templateId: string;
  templateName: string;
  systemPrompt: string;
  dataJson: string;
  headerTitle: string;
}

export async function prepareGeneration(
  req: GenerationRequest,
  user: { id: string; plan: import("@/lib/domain").Plan },
): Promise<PreparedGeneration> {
  const s = getStore();
  const template = s.templates.find((t) => t.id === req.templateId);
  if (!template) throw new ServiceError("TEMPLATE_NOT_FOUND", `No template '${req.templateId}'`, 404);

  const ctx = buildContext(req.sourceType, req.sourceId);
  if (!ctx) throw new ServiceError("SOURCE_NOT_FOUND", `No ${req.sourceType} source '${req.sourceId}'`, 404);

  const accessible = user.plan === "pro" || s.projects.find((p) => p.id === (ctx.projectId || req.sourceId))?.isDemo;
  if (!accessible) {
    throw new ServiceError("PRO_REQUIRED", "This source belongs to the Pro universe (500+ projects).", 403);
  }
  if (user.plan === "free" && (await generationsUsedToday(user.id)) >= FREE_GENERATION_LIMIT) {
    throw new ServiceError("LIMIT_REACHED", `Free plan includes ${FREE_GENERATION_LIMIT} generations/day. Upgrade to Pro for unlimited.`, 429);
  }

  await recordGeneration(user.id);
  logger.info("studio", "generation prepared", { user: user.id, sourceType: req.sourceType, sourceId: req.sourceId, template: template.name, tone: req.tone });

  return {
    ctx,
    templateId: template.id,
    templateName: template.name,
    systemPrompt: template.systemPrompt ?? "You are INTENT Analyst, a senior crypto researcher.",
    dataJson: JSON.stringify(ctx.data, null, 2),
    headerTitle: ctx.title.replace(/[^\x20-\xFF]/g, "-"),
  };
}

export function composeLocal(ctx: StudioContext, templateId: string, tone: Tone): string {
  const s = getStore();
  const template = s.templates.find((t) => t.id === templateId)!;
  return composeDraft(ctx, template, tone);
}

/** Streams text chunk-wise to emulate token streaming. */
export function createLocalStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const words = text.split(/(?<=\s)/);
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      let out = "";
      for (let k = 0; k < 4 && i < words.length; k++, i++) out += words[i];
      controller.enqueue(encoder.encode(out));
      if (i >= words.length) controller.close();
      else await new Promise((r) => setTimeout(r, 18));
    },
  });
}
