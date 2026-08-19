import { createOpenAI } from "@ai-sdk/openai";

/**
 * AI provider untuk Customer Support — OpenAI-compatible endpoint custom.
 * Base URL default: https://api.hcnsec.cn/ (keputusan maintainer).
 * Key/model override via env; bila endpoint menolak/gagal, route jatuh ke
 * engine lokal (support tetap menjawab).
 */

export const SUPPORT_AI_BASE_URL = process.env.SUPPORT_AI_BASE_URL ?? "https://api.hcnsec.cn/";
export const SUPPORT_AI_MODEL = process.env.SUPPORT_AI_MODEL ?? "gpt-4o-mini";

export function supportProvider() {
  return createOpenAI({
    baseURL: SUPPORT_AI_BASE_URL,
    apiKey: process.env.SUPPORT_AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "cif-public",
    headers: { "User-Agent": "cif-intent-support/0.2" },
  });
}
