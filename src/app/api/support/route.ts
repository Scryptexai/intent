import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerSupport, getThread, aiSystemPrompt, buildContext, detectLang } from "@/services/support/engine";
import { getSession } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ message: z.string().min(1).max(2000) });

/** GET — thread history. POST — human-feel answer (streamed when OPENAI_API_KEY). */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  const thread = getThread(s?.uid ?? null);
  return NextResponse.json({ messages: thread.messages, meta: thread.meta });
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const s = await getSession(req);
  const uid = s?.uid ?? null;

  // Mode AI penuh: provider OpenAI-compatible di SUPPORT_AI_BASE_URL
  // (default https://api.hcnsec.cn/). Gagal → fallback engine lokal.
  const { supportProvider, SUPPORT_AI_BASE_URL, SUPPORT_AI_MODEL } = await import("@/lib/ai/provider");
  let reachable = false;
  try {
    // probe ringan: host merespons apa pun = reachable (network error = tidak)
    await fetch(`${SUPPORT_AI_BASE_URL}models`, {
      headers: { Authorization: `Bearer ${process.env.SUPPORT_AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "cif-public"}` },
      signal: AbortSignal.timeout(3000),
    });
    reachable = true;
  } catch {
    reachable = false;
  }
  if (reachable)
    try {
    const ctx = await buildContext(uid);
    const thread = getThread(uid);
    const { streamText } = await import("ai");
    thread.messages.push({ role: "user", text: parsed.data.message, at: new Date().toISOString() });
    const provider = supportProvider();
    const result = await streamText({
      model: provider(SUPPORT_AI_MODEL),
      system: aiSystemPrompt(ctx, detectLang(parsed.data.message), thread.messages),
      prompt: parsed.data.message,
      temperature: 0.8,
      abortSignal: AbortSignal.timeout(12_000),
      onFinish: ({ text }) => {
        thread.messages.push({ role: "support", text, at: new Date().toISOString() });
      },
    });
    return result.toTextStreamResponse();
  } catch {
    // provider tak terjangkau dari host ini → engine lokal (tetap kontekstual)
  }

  const { reply, ticket } = await answerSupport(uid, parsed.data.message);
  return NextResponse.json({ reply, ticket });
}
