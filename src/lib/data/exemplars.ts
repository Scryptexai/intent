/**
 * EXEMPLARS (docs/BRIEF-RUBRIC.md §Exemplars, Tahap 2 arah produk) —
 * konten kurasi manusia yang ditumpangkan di atas pipeline otomatis
 * (`services/decision-brief.ts`). Reference implementation kualitas premium;
 * selisih pipeline-vs-exemplar = backlog perbaikan.
 */

export interface Exemplar {
  slug?: string;
  decisionOpen?: string;
  addRisks?: string[];
  addDissent?: string[];
  addWatch?: string[];
  addInvalidation?: string[];
  addSeek?: string[];
  changedNote?: string;
}

export const EXEMPLARS: Record<string, Exemplar> = {
  ethena: {
    decisionOpen:
      "Whether sUSDe yield composition survives a points taper is still open — the loop component is measurable, the organic component is not yet.",
    addRisks: [
      "Ethena's hedge book has kept delta-neutrality through prior stress windows — the inflation thesis may over-weight the loop and under-weight desk discipline.",
    ],
    addDissent: [
      "Counter-read: loop-driven TVL is rational arbitrage, not fragility — if basis stays positive post-taper, the 'inflation' framing ages badly.",
    ],
    addWatch: ["sUSDe net mint/redemptions split by wallet cohort (new vs recycled).", "ENA/points emission schedule announcements."],
    addInvalidation: ["sUSDe net inflows stay positive for 30 consecutive days after a ≥30% emission taper."],
    addSeek: ["Hedge-book transparency update (counterparty & basis distribution)."],
    changedNote: "The material change this cycle is the gap between gross TVL growth and unique-wallet growth — it reframes the thesis from 'adoption' to 'recycling'.",
  },
  blur: {
    decisionOpen: "Whether the season-2 cohort is supply-overhang or price-discovery is unresolved until the vesting cliff passes.",
    addRisks: [
      "Airdrop recipients historically sell into any liquidity — including liquidity created by their own cohort's optimism; exit depth is the real risk, not sentiment.",
    ],
    addDissent: [
      "Alternative read: low-float + marketplace fee switch rumors can produce a short-squeeze regime where the dump thesis is right on fundamentals but wrong on timing.",
    ],
    addWatch: ["7-day sell-through of claimed supply.", "Marketplace volume share vs OpenSea/MagicEden delta."],
    addInvalidation: ["Claimed-supply sell-through stays < 20% two weeks post-cliff with volume share stable."],
    addSeek: ["Wallet-level claim-and-hold distribution for the season-2 cohort."],
  },
  layerzero: {
    decisionOpen: "Pre-token: the only testable question is allocation behavior post-sybil filter, not price.",
    addRisks: [
      "Sybil-filtered reallocation can still be captured by industrial farmers via identity markets — the 'cleaner' distribution may be cleaner on-chain only.",
    ],
    addDissent: [
      "Bull case dissent: omnichain messaging volume is real usage with switching costs; messaging fees give a durable revenue base most airdrop meta lacks.",
    ],
    addWatch: ["Bridging volume retention after each sybil-burn event.", "Share of messaging fees from top-10 dApps vs long tail."],
    addInvalidation: ["Post-allocation, 90d messaging volume holds ≥ 70% of pre-sybil-filter levels."],
    addSeek: ["Primary-source breakdown of sybil-cluster sell behavior in comparable launches."],
  },
};
