import type { StudioContext } from "@/lib/ai/context";
import { getStore } from "@/lib/store";
import type { TemplateRow } from "@/lib/domain";

/**
 * Deterministic local composer — used when OPENAI_API_KEY is not configured.
 * Produces a real, data-anchored draft from the structured context so the
 * full Content Studio loop works offline. In production this path is replaced
 * by Vercel AI SDK `streamText` with the template's system prompt.
 */

export type Tone = "professional" | "casual" | "controversial";

type Pov = { segment: string; allocation_pct: number; sold_7d_pct: number; sold_30d_pct: number; holding_pct: number; avg_claim_usd: number };
type AirdropData = { token: string; dropped_usd: number; claimants: number; claim_rate_pct: number; sell_pressure_7d_pct: number; sybil_pct: number } | null;

function usd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function composeDraft(ctx: StudioContext, template: TemplateRow, tone: Tone): string {
  const d = ctx.data as {
    airdrop?: AirdropData;
    pov_matrix?: Pov[];
    decision_events?: { title: string; kind: string }[];
    active_patterns?: string[];
    project?: { name: string; category: string; tvl_usd: number; volume_24h_usd: number; sentiment: number };
    signal?: { type: string; strength: number; payload: Record<string, unknown> };
    trend_30d?: { tvl_change_pct: number; volume_change_pct: number; sentiment_delta: number };
    pattern?: { name: string; base_rate: number; description: string };
    currently_affected_projects?: { name: string; activation: number; category: string }[];
    knowledge?: { statement: string; source: string; confidence: number };
  };

  const pov = d.pov_matrix ?? [];
  const drop = d.airdrop ?? null;
  const project = d.project ?? { name: ctx.projectName, category: "—", tvl_usd: 0, volume_24h_usd: 0, sentiment: 0 };
  const events = d.decision_events ?? [];
  const patterns = d.active_patterns ?? [];
  const casual = tone === "casual";
  const ser = getStore().projects.find((p) => p.id === ctx.projectId)?.series ?? [];
  const m30up = ser.length ? ser[ser.length - 1].tvl >= ser[0].tvl : true;

  const headlineStat =
    drop?.sell_pressure_7d_pct != null
      ? `${drop.sell_pressure_7d_pct}% of ${drop.token} recipients sold within 7 days`
      : d.signal
        ? `${project.name} ${d.signal.type.replace(/_/g, " ")} signal at ${(Number(d.signal.strength) * 100).toFixed(0)}% strength`
        : d.pattern
          ? `${d.pattern.name} has a ${(Number(d.pattern.base_rate) * 100).toFixed(0)}% historical base rate`
          : d.knowledge
            ? d.knowledge.statement
            : `${project.name} TVL at ${usd(project.tvl_usd)}`;

  const retail = pov.find((p) => p.segment === "retail");
  const vc = pov.find((p) => p.segment === "vc");
  const farmers = pov.find((p) => p.segment === "farmers");
  const event = events.find((e) => e.kind === "decision") ?? events[0];
  const contr = tone === "controversial";
  if (contr) {
    const punch = `Unpopular opinion: ${headlineStat} — and almost everyone tweeting about ${project.name} hasn't read the claim window. The data below will annoy them. 🧵`;
    if (template.id === "tpl-tldr") {
      return `## TL;DR (spicy)\n- **WHAT** — ${headlineStat}. Everyone saw it; nobody read it.\n- **SO-WHAT** — ${event ? `"${event.title}" made this inevitable` : `the ${patterns[0] ?? "incentive"} machine made this inevitable`}. Feelings ≠ flows.\n- **NOW-WHAT** — The next TGE without lockups prints the same chart. Screenshot this.`;
    }
    const rows = pov.slice(0, 3).map((p) => `| ${p.segment.toUpperCase()} | ${p.allocation_pct}% | ${p.sold_7d_pct}% |`).join("\n");
    return `${punch}\n\n${retail && vc ? `Retail dumped ${retail.sold_7d_pct}% of their claim in a week while VCs sold ${vc.sold_7d_pct}%. Guess which cohort "believes in the protocol".\n\n` : ""}${rows ? `| Segment | Allocation | Sold 7d |\n|---|---|---|\n${rows}\n\n` : ""}Follow the claim-window, not the influencer. Tag someone who needs this. 🔥\n\n— Powered by INTENT · Know the Intent. See the Signal.`;
  }

  const sources = [
    "INTENT · POV Matrix",
    drop ? `${drop.claimants.toLocaleString()} claimants · ${usd(drop.dropped_usd)} dropped` : null,
    patterns.length ? `Pattern engine: ${patterns.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n• ");

  const tldr = `## TL;DR\n- **WHAT** — ${headlineStat}.\n- **SO-WHAT** — ${event ? `the causal fork was "${event.title}"` : patterns.length ? `the ${patterns[0]} pattern explains the flow` : "structural incentives, not sentiment, drove the outcome"}.\n- **NOW-WHAT** — apply this filter to every upcoming TGE before entry.`;

  if (template.id === "tpl-tldr") {
    return `${tldr}\n\n_Methodology: INTENT dataset · window 90d · confidence ${drop ? "high (on-chain)" : "medium"}_`;
  }

  if (template.id === "tpl-data-drop") {
    const rows = pov.slice(0, 3).map((p) => `| ${p.segment.toUpperCase()} | ${p.allocation_pct}% | ${p.sold_7d_pct}% | ${p.holding_pct}% |`).join("\n");
    return `# ${headlineStat}\n\n| Segment | Allocation | Sold 7d | Still holding |\n|---|---|---|---|\n${rows || `| ${project.name} | — | — | — |`}\n\n_Methodology: claim-window cohort analysis · 90d · sample ${drop ? drop.claimants.toLocaleString() : "n/a"} wallets · Powered by INTENT_`;
  }

  if (template.id === "tpl-linkedin-brief") {
    return `${casual ? "Let's talk about" : "Analysis:"} ${project.name} — ${headlineStat}\n\n**Context.** ${project.name} (${project.category}) operates at ${usd(project.tvl_usd)} TVL with ${usd(project.volume_24h_usd)} in 24h volume. ${drop ? `Its ${drop.token} airdrop distributed ${usd(drop.dropped_usd)} to ${drop.claimants.toLocaleString()} claimants (${drop.claim_rate_pct}% claim rate, ${drop.sybil_pct}% flagged sybil).` : ""}\n\n**Evidence.** ${retail && vc ? `Retail claimed ${retail.allocation_pct}% of supply and sold ${retail.sold_7d_pct}% inside the first week; VCs — holding ${vc.allocation_pct}% — sold just ${vc.sold_7d_pct}%. The divergence is the story.` : headlineStat + "."} ${event ? `The proximate cause traces to a single decision event: "${event.title}".` : ""}\n\n**Implications.** ${patterns.length ? `This is the ${patterns[0]} signature; its historical base rate prices this outcome as the modal case, not the exception.` : "The outcome is structural, not emotional."} Cohorts without lockups convert claims into exit liquidity within days.\n\n**Takeaway.** Evaluate claim-window structure before FDV. ${casual ? "That's the whole game." : "This framework generalizes to all upcoming distributions."}\n\n— Sources: • ${sources}`;
  }

  // Default: Thread Analyst (6 tweets)
  const bullet = "▪";
  return `${casual ? "wild stat →" : ""} 1/ ${headlineStat}.\n\nNot panic. Structure. Here's the POV breakdown ${casual ? "👇" : "🧵"}\n\n2/ ${retail ? `Retail claimed ${retail.allocation_pct}% of supply and dumped ${retail.sold_7d_pct}% of it in week one.` : "The claim cohort moved fast."} ${farmers ? `Farmers — ${farmers.allocation_pct}% of supply — sold ${farmers.sold_7d_pct}%. This cohort was never here for the protocol.` : ""}\n\n3/ ${vc ? `VCs held ${vc.allocation_pct}% of the drop and sold just ${vc.sold_7d_pct}%. Their cost basis is zero and their horizon is the unlock schedule, not the chart.` : "The sophisticated cohort barely sold."}\n${bullet} ${drop ? `Sybil share: ${drop.sybil_pct}%` : ""}\n${bullet} ${drop ? `Claim rate: ${drop.claim_rate_pct}%` : ""}\n\n4/ ${event ? `The causal fork: "${event.title}".` : "The driver is structural."} ${patterns.length ? `The ${patterns[0]} pattern captures exactly this flow.` : ""} Instant claimability = instant exit liquidity.\n\n5/ Prediction: every upcoming TGE without a lockup prints the same signature. Watch the claim-window, not the FDV.${casual ? " screenshot this." : ""}\n\n6/ — Sources:\n• ${sources}\n\nPowered by INTENT · Know the Intent. See the Signal.`;
}
