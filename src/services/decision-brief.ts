import { getStore } from "@/lib/store";
import type { ProjectRow } from "@/lib/domain";
import { patternActivations } from "@/services/vectors";
import { computeRadar } from "@/services/market/radar";
import { findAnalogProject } from "@/services/similarity-engine";
import { getCifDataset, cifDossier } from "@/services/cif-loader";
import { EXEMPLARS } from "@/lib/data/exemplars";

/**
 * ── PREMIUM DECISION BRIEF (docs/PRODUCT-DIRECTION.md) ─────────────────────
 * Merakit 7 seksi brief: The Decision · Current Read (3 dimensi) ·
 * What Changed · Evidence Ledger (+Unknown eksplisit) · Historical Analogs
 * (struktural+mismatch+konteks+hasil+relevansi) · Red Team · Decision Gates.
 * Fakta & bukti = gratis (trust-depth); lapisan interpretasi = scope berbayar.
 */

export type Conclusion = "proceed" | "monitor" | "defer" | "avoid";
export type ThesisImpact = "strengthens" | "weakens" | "neutral";

export interface ChangedItem {
  asOf: string;
  source: string;
  metric: string;
  direction: "up" | "down" | "flat";
  deviation: number;
  thesis: ThesisImpact;
  note?: string;
}
export interface LedgerItem {
  claim: string;
  passage: string;
  source: string;
  asOf: string;
  level: "HIGH" | "MED" | "LOW";
  conflict: string | null;
  limitation: string | null;
}
export interface AnalogItem {
  name: string;
  slug: string;
  similarity: number;
  structural: string;
  mismatch: string;
  context: string;
  outcome: string;
  relevance: string;
}
export interface PremiumBrief {
  asOf: string;
  decision: { allocation: string[]; horizon: string; exposure: string; open: string };
  read: { conclusion: Conclusion; evidenceQuality: number; patternConfidence: number; trajectoryUncertainty: number };
  changed: ChangedItem[];
  ledger: LedgerItem[];
  unknowns: string[];
  analogs: AnalogItem[];
  redTeam: { risks: string[]; dissent: string[]; conflicts: string[] };
  gates: { watch: string[]; invalidation: string[]; next: string; reviewDate: string; seek: string[] };
}

const $ = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${Math.round(n / 1e3)}K`);

export async function buildPremiumBrief(project: ProjectRow): Promise<PremiumBrief> {
  const s = getStore();
  const asOf = new Date().toISOString();
  const ser = project.series;
  const m30 = ser[ser.length - 1].tvl / Math.max(1, ser[0].tvl) - 1;
  const vol30 = ser[ser.length - 1].volume / Math.max(1, ser[0].volume) - 1;

  const acts = patternActivations(s, project);
  const hot = s.patterns.map((p, i) => ({ p, a: acts[i] ?? 0 })).filter((x) => x.a >= 0.3).sort((a, b) => b.a - a.a);
  const pc = Math.round(Math.min(0.95, 0.35 + (hot[0]?.a ?? 0) * 0.5) * 100) / 100;
  const tp = Math.round(Math.min(0.9, Math.max(0.1, 0.5 + m30 + project.sentiment * 0.2)) * 100) / 100;

  const cif = cifDossier(await getCifDataset(), project.slug);
  const qa = cif?.qa as { total?: number } | undefined;
  const evidenceQuality = cif ? Math.min(0.95, Math.max(0.2, ((qa?.total ?? 50) / 100) * 0.8 + 0.2)) : 0.25;
  const trajectoryUncertainty = Math.round(Math.min(0.95, Math.max(0.1, 1 - tp * 0.7 - evidenceQuality * 0.3)) * 100) / 100;

  const conclusion: Conclusion =
    evidenceQuality < 0.3 ? "avoid" : pc >= 0.55 && tp >= 0.6 ? "proceed" : tp >= 0.45 ? "monitor" : "defer";

  // ── 1. The Decision (parameter keputusan, bukan nama proyek) ──
  const decision = {
    allocation: ["capital", "time", "effort"],
    horizon: "30–90 days",
    exposure: conclusion === "proceed" ? "exploratory risk budget (≤ 2% portfolio)" : "no commitment — observation only",
    open:
      conclusion === "proceed"
        ? "Position sizing pending organic-flow verification."
        : conclusion === "monitor"
          ? "Whether inflows are organic or incentive-driven remains open."
          : "Insufficient evidence to commit any allocation yet.",
  };

  // ── 3. What changed / why it matters ──
  const radar = (await computeRadar()).filter((r) => r.projectSlug === project.slug);
  const changed: ChangedItem[] = [
    {
      asOf,
      source: "internal series (30d)",
      metric: "tvl",
      direction: m30 > 0.02 ? "up" : m30 < -0.02 ? "down" : "flat",
      deviation: Math.round(m30 * 1000) / 10,
      thesis: m30 > 0.05 ? "strengthens" : m30 < -0.05 ? "weakens" : "neutral",
    },
    {
      asOf,
      source: "internal series (30d)",
      metric: "volume",
      direction: vol30 > 0.05 ? "up" : vol30 < -0.05 ? "down" : "flat",
      deviation: Math.round(vol30 * 1000) / 10,
      thesis: Math.abs(vol30) > 0.2 ? (project.sentiment >= 0 ? "strengthens" : "weakens") : "neutral",
    },
    ...radar.slice(0, 3).map<ChangedItem>((r) => ({
      asOf,
      source: r.sources[0] ?? "edge radar",
      metric: r.kind,
      direction: r.severity >= 0.5 ? "up" : "down",
      deviation: Math.round(r.severity * 100) / 100,
      thesis: r.kind.includes("div") || r.kind.includes("unlock") ? "weakens" : "strengthens",
    })),
  ];

  // ── 4. Evidence ledger (+ unknowns eksplisit) ──
  const conflicts = (cif?.conflicts ?? []) as { a?: string; b?: string; topic?: string }[];
  const ledger: LedgerItem[] = (cif?.knowledge ?? [])
    .slice(0, 6)
    .map((k: { name?: string; nm?: string; evidenceText?: string; source?: string; author?: string; confidence?: number; asOf?: string }, i: number) => ({
      claim: k.name ?? k.nm ?? "—",
      passage: k.evidenceText ?? "—",
      source: k.source ?? k.author ?? "INTENT dossier",
      asOf: k.asOf ?? asOf.slice(0, 10),
      level: (k.confidence ?? 0) >= 80 ? "HIGH" : (k.confidence ?? 0) >= 60 ? "MED" : "LOW",
      conflict: conflicts[i] ? `${conflicts[i].topic ?? "conflict"}: ${conflicts[i].a ?? ""} vs ${conflicts[i].b ?? ""}` : null,
      limitation: (k.confidence ?? 0) < 60 ? "single-source or dated passage — verify before reuse" : null,
    }));

  const unknowns: string[] = [];
  if (!cif) unknowns.push("No locked dossier for this project — historical structure not audited. Treated as Unknown, not as safe.");
  if (cif && ledger.length < 3) unknowns.push("Dossier knowledge is thin (<3 cited items) — evidence quality capped.");
  if (radar.length === 0) unknowns.push("No live divergence signal this cycle — absence of alert is not evidence of health.");
  if (hot.length === 0) unknowns.push("No dominant historical pattern active — analogical confidence is low by design.");

  // ── 5. Historical analogs (struktural + mismatch + konteks + hasil) ──
  let analogs: AnalogItem[] = [];
  try {
    analogs = findAnalogProject(project.id, 3).analogs.map((a) => {
      const serA = a.project.series;
      const mA = serA[serA.length - 1].tvl / Math.max(1, serA[0].tvl) - 1;
      const actsA = patternActivations(s, a.project);
      const hotA = s.patterns.map((p, i) => ({ p, x: actsA[i] ?? 0 })).filter((z) => z.x >= 0.3).sort((x, y) => y.x - x.x)[0];
      const mismatch =
        a.project.category !== project.category
          ? `Different category (${a.project.category} vs ${project.category}) — transfer flows with care.`
          : Math.abs(mA - m30) > 0.25
            ? `Different momentum regime at comparison (${(mA * 100).toFixed(0)}% vs ${(m30 * 100).toFixed(0)}% 30d).`
            : "No material structural mismatch detected at current resolution.";
      return {
        name: a.project.name,
        slug: a.project.slug,
        similarity: a.similarity,
        structural: a.rationale,
        mismatch,
        context: `Analog observed with sentiment ${a.project.sentiment.toFixed(2)} and ${(mA * 100).toFixed(0)}% 30d momentum.`,
        outcome: hotA ? `Dominant pattern then: ${hotA.p.name} (activation ${hotA.x.toFixed(2)}).` : "No dominant pattern recorded for the analog.",
        relevance:
          a.similarity >= 0.7
            ? "Strong structural overlap — worth monitoring side-by-side."
            : a.similarity >= 0.45
              ? "Partial overlap — use as reference, not as baseline."
              : "Weak overlap — illustrative only.",
      };
    });
  } catch {
    analogs = [];
  }

  // ── 6. Red team ──
  const risks: string[] = [];
  const riskPat = hot.find((h) => ["unlock-overhang", "tvl-inflation-loop", "mercenary-liquidity"].includes(h.p.slug));
  if (riskPat) risks.push(`${riskPat.p.name} active at ${(riskPat.a ?? 0).toFixed(2)} — structural, historically ${(Math.round((riskPat.p.baseRate ?? 0.5) * 100))}% base rate.`);
  if (project.sentiment > 0.4 && m30 > 0.2) risks.push("Crowded optimism: positive sentiment + fast inflows historically precede mean-reversion when incentives taper.");
  if (vol30 > 0.5) risks.push("Volume rotation outpaces TVL — possible wash/mercenary activity inflating the signal.");
  if (risks.length === 0) risks.push("No structural risk pattern active at current thresholds — residual risk remains (model & data latency).");

  const dissent: string[] = [];
  const counter = s.patterns.map((p, i) => ({ p, a: acts[i] ?? 0 })).filter((x) => x.a >= 0.2 && x.a < 0.3)[0];
  if (counter) dissent.push(`Alternative read: ${counter.p.name} is sub-threshold but rising — the bear case is not dead, only quiet.`);
  dissent.push("Interpretation bias: the dominant pattern matches the current narrative; base-rate neglect is the usual failure mode here.");
  if (conflicts.length > 0) dissent.push("Source disagreement exists in the dossier — the ledger flags it per claim; do not average it away.");

  // ── 7. Decision gates ──
  const watch = [...radar.map((r) => r.title), ...hot.slice(0, 2).map((h) => `${h.p.name} activation trend (weekly)`)];
  const invalidation = [
    m30 >= 0
      ? "30d TVL momentum flips negative while sentiment stays positive (divergence breakdown)."
      : "TVL stabilizes for 3+ weeks with sentiment recovery — the avoid read expires.",
    "Primary risk pattern activation crosses 0.5 without offsetting organic-flow evidence.",
  ];
  const gates = {
    watch: watch.slice(0, 4),
    invalidation,
    next:
      conclusion === "proceed"
        ? "Most reversible next step: add to diligence watchlist and timebox a 10-hour deep-dive — no capital commitment yet."
        : conclusion === "monitor"
          ? "Most reversible next step: set watch conditions below; revisit only on trigger, not on noise."
          : "Most reversible next step: do nothing now; schedule an evidence check on the review date.",
    reviewDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    seek: [
      "Organic vs incentive-driven flow split (wallet cohort retention).",
      "Team/insider wallet behavior around the next unlock window.",
      cif ? "Independent second source for the two lowest-confidence ledger claims." : "A first locked dossier / primary-source audit for this project.",
    ],
  };


  // ── Exemplar overlay (Tahap 2): kurasi manusia di atas pipeline ──
  const ex = EXEMPLARS[project.slug];
  if (ex) {
    if (ex.decisionOpen) decision.open = ex.decisionOpen;
    risks.push(...(ex.addRisks ?? []));
    dissent.push(...(ex.addDissent ?? []));
    gates.watch = [...gates.watch, ...(ex.addWatch ?? [])].slice(0, 6);
    gates.invalidation = [...gates.invalidation, ...(ex.addInvalidation ?? [])];
    gates.seek = [...gates.seek, ...(ex.addSeek ?? [])];
    if (ex.changedNote && changed[0]) changed[0] = { ...changed[0], note: ex.changedNote } as (typeof changed)[number];
  }

  return { asOf, decision, read: { conclusion, evidenceQuality, patternConfidence: pc, trajectoryUncertainty }, changed, ledger, unknowns, analogs, redTeam: { risks, dissent, conflicts: conflicts.slice(0, 3).map((c) => `${c.topic ?? "conflict"}: ${c.a ?? ""} vs ${c.b ?? ""}`) }, gates };
}
