import { hashSeed, mulberry32, pick, range, round } from "@/lib/prng";
import type {
  ActorClaimRow,
  AirdropRow,
  AlertRow,
  AnomalyLogRow,
  CalibrationCall,
  ConflictRow,
  NotificationRow,
  DraftRow,
  EntityRow,
  EventRow,
  KnowledgeRow,
  MetricPoint,
  NarrativeEvidenceRow,
  NarrativeRow,
  PatternRow,
  PovRow,
  ProjectRow,
  SignalRow,
  SimulationRow,
  TemplateRow,
  UserRow,
  WatchlistRow,
} from "@/lib/domain";

/* ════════════════════════════════════════════════════════════════════════
   CIF demo universe — deterministic, reproducible dataset.
   500 projects (29 named · 6 hero), 16 patterns, 1,039 knowledge items.
   ════════════════════════════════════════════════════════════════════════ */

export const CATEGORIES = [
  "Lending",
  "DEX",
  "LSD",
  "Bridge",
  "NFT Marketplace",
  "Perps",
  "Restaking",
  "Derivatives",
  "L1",
  "L2",
  "Oracles",
  "Yield",
] as const;

export const PATTERN_DEFS: Omit<PatternRow, "id">[] = [
  { slug: "vesting-cliff-dump", name: "Vesting Cliff Dump", baseRate: 0.71, description: "Price and sell-pressure spike predictably around token unlock cliffs; early cohorts exit into liquidity.", impact: { tvl: -0.04, sentiment: -0.35, volume: 0.55 } },
  { slug: "airdrop-farm-rotation", name: "Airdrop Farm Rotation", baseRate: 0.82, description: "Sybil-heavy claimants rotate capital into the next points program within days of TGE.", impact: { tvl: -0.12, sentiment: 0.1, volume: 0.4 } },
  { slug: "mercenary-liquidity", name: "Mercenary Liquidity Exit", baseRate: 0.66, description: "Incentive-funded TVL leaves within one epoch once emissions drop below opportunity cost.", impact: { tvl: -0.3, sentiment: -0.1, volume: -0.15 } },
  { slug: "narrative-momentum", name: "Narrative Momentum", baseRate: 0.58, description: "Attention cascades lift all category tickers regardless of fundamentals for 2–6 weeks.", impact: { tvl: 0.2, sentiment: 0.45, volume: 0.7 } },
  { slug: "unlock-overhang", name: "Unlock Overhang", baseRate: 0.69, description: "Known future supply suppresses price multiples weeks before the actual unlock date.", impact: { tvl: 0, sentiment: -0.25, volume: -0.1 } },
  { slug: "restaking-flywheel", name: "Restaking Flywheel", baseRate: 0.54, description: "Points + LRT + AVS loop compounds TVL until a shock unwinds leverage simultaneously.", impact: { tvl: 0.5, sentiment: 0.3, volume: 0.25 } },
  { slug: "points-frenzy", name: "Points Frenzy", baseRate: 0.77, description: "Opaque points programs inflate usage metrics; measured activity overstates organic demand 3–9x.", impact: { tvl: 0.35, sentiment: 0.2, volume: 0.5 } },
  { slug: "tvl-inflation-loop", name: "TVL Inflation Loop", baseRate: 0.61, description: "Recursive collateral rehypothecation inflates reported TVL vs. unique underlying assets.", impact: { tvl: 0.4, sentiment: 0.05, volume: 0.1 } },
  { slug: "whale-accumulation", name: "Whale Accumulation", baseRate: 0.63, description: "Top-50 wallet share rising while price flat = distribution completed, base forming.", impact: { tvl: 0.05, sentiment: 0.15, volume: -0.2 } },
  { slug: "retail-euphoria-top", name: "Retail Euphoria Top", baseRate: 0.74, description: "Social dominance + funding spikes coincide with local tops 78% of the time in majors.", impact: { tvl: 0.02, sentiment: 0.6, volume: 0.8 } },
  { slug: "bridge-exploit-recovery", name: "Bridge Exploit Recovery", baseRate: 0.42, description: "Protocols that reimburse fully recover TVL in ~90 days; partial reimbursement → slow bleed.", impact: { tvl: -0.5, sentiment: -0.55, volume: 0.3 } },
  { slug: "governance-capture", name: "Governance Capture", baseRate: 0.48, description: "Single voter >40% quorum precedes value-extraction proposals within two quarters.", impact: { tvl: -0.08, sentiment: -0.2, volume: 0 } },
  { slug: "oracle-manipulation", name: "Oracle Manipulation", baseRate: 0.35, description: "Thin-pool price feeds exploited via flash-loan skew; detectable via deviation anomalies.", impact: { tvl: -0.2, sentiment: -0.4, volume: 0.6 } },
  { slug: "ecosystem-grant-pump", name: "Ecosystem Grant Pump", baseRate: 0.57, description: "Grant announcements lift TVL temporarily; retention after 90d averages 31%.", impact: { tvl: 0.15, sentiment: 0.25, volume: 0.2 } },
  { slug: "insider-front-running", name: "Insider Front-Running", baseRate: 0.39, description: "Wallets created <48h before listing capturing outsized allocations signals insider access.", impact: { tvl: 0, sentiment: -0.3, volume: 0.35 } },
  { slug: "low-float-high-fdv", name: "Low Float / High FDV Trap", baseRate: 0.81, description: "Sub-15% float at TGE with >$1B FDV underperforms category median for 12 months.", impact: { tvl: 0.05, sentiment: -0.15, volume: 0.15 } },
];

interface NamedProject {
  slug: string; name: string; category: string; token: string | null;
  tvl: number; vol: number; sent: number; launch: string; hero?: boolean; demo?: boolean;
  desc: string;
}

export const NAMED_PROJECTS: NamedProject[] = [
  { slug: "blur", name: "Blur", category: "NFT Marketplace", token: "BLUR", tvl: 42_000_000, vol: 187_000_000, sent: -0.12, launch: "2022-10-19", hero: true, demo: true, desc: "Pro NFT marketplace. Season-2 farming cohort shows classic airdrop-farm-rotation signature." },
  { slug: "eigenlayer", name: "EigenLayer", category: "Restaking", token: "EIGEN", tvl: 15_400_000_000, vol: 96_000_000, sent: 0.31, launch: "2023-06-12", hero: true, demo: true, desc: "Restaking pioneer. Restaking-flywheel active; slashable-AVS decision chain is the key fork." },
  { slug: "arbitrum", name: "Arbitrum", category: "L2", token: "ARB", tvl: 3_100_000_000, vol: 812_000_000, sent: 0.18, launch: "2021-05-28", hero: true, demo: true, desc: "Leading optimistic rollup. 2024 unlock overhang absorbed; DAO treasury rotation ongoing." },
  { slug: "ethena", name: "Ethena", category: "Yield", token: "ENA", tvl: 5_900_000_000, vol: 1_240_000_000, sent: 0.22, launch: "2024-04-02", hero: true, desc: "Delta-neutral synthetic dollar. TVL-inflation-loop flagged: sUSDe looping inflates gross TVL ~1.4x." },
  { slug: "hyperliquid", name: "Hyperliquid", category: "Perps", token: "HYPE", tvl: 2_700_000_000, vol: 9_800_000_000, sent: 0.54, launch: "2023-06-01", hero: true, desc: "On-chain perps DEX. Narrative-momentum + whale-accumulation both active — strongest signal stack in universe." },
  { slug: "lido", name: "Lido", category: "LSD", token: "LDO", tvl: 24_800_000_000, vol: 61_000_000, sent: 0.08, launch: "2020-12-17", hero: true, desc: "Largest liquid-staking protocol. Governance-capture watch: top voter concentration at 43%." },
  { slug: "uniswap", name: "Uniswap", category: "DEX", token: "UNI", tvl: 6_200_000_000, vol: 1_900_000_000, sent: 0.15, launch: "2018-11-02", desc: "Canonical AMM; fee-switch decision perpetually pending." },
  { slug: "aave", name: "Aave", category: "Lending", token: "AAVE", tvl: 12_300_000_000, vol: 540_000_000, sent: 0.2, launch: "2020-01-08", desc: "Money-lego lender; GHO expansion and RWA listings." },
  { slug: "maker", name: "Sky (Maker)", category: "Lending", token: "MKR", tvl: 9_100_000_000, vol: 210_000_000, sent: 0.02, launch: "2017-12-18", desc: "Rebranded to Sky; RWA-heavy collateral book." },
  { slug: "curve", name: "Curve", category: "DEX", token: "CRV", tvl: 2_400_000_000, vol: 380_000_000, sent: -0.2, launch: "2020-01-20", desc: "Stableswap venue; founder-debt episodes left a governance scar." },
  { slug: "zksync", name: "zkSync Era", category: "L2", token: "ZK", tvl: 640_000_000, vol: 290_000_000, sent: -0.31, launch: "2023-02-15", desc: "ZK rollup. TGE underperformance is the textbook low-float-high-fdv case study." },
  { slug: "starknet", name: "Starknet", category: "L2", token: "STRK", tvl: 310_000_000, vol: 120_000_000, sent: -0.26, launch: "2023-02-07", desc: "Cairo-based L2; heavy farming cohort churn post-airdrop." },
  { slug: "optimism", name: "Optimism", category: "L2", token: "OP", tvl: 890_000_000, vol: 460_000_000, sent: 0.11, launch: "2021-11-11", desc: "Superchain thesis; recurring scheduled unlocks." },
  { slug: "layerzero", name: "LayerZero", category: "Bridge", token: "ZRO", tvl: 180_000_000, vol: 95_000_000, sent: -0.08, launch: "2022-03-31", desc: "Omnichain messaging; sybil-screening set the airdrop standard." },
  { slug: "wormhole", name: "Wormhole", category: "Bridge", token: "W", tvl: 150_000_000, vol: 74_000_000, sent: -0.05, launch: "2021-09-13", desc: "Recovered from 2022 exploit via full reimbursement — canonical bridge-exploit-recovery." },
  { slug: "pendle", name: "Pendle", category: "Yield", token: "PENDLE", tvl: 3_900_000_000, vol: 620_000_000, sent: 0.42, launch: "2021-04-28", desc: "Yield tokenization; primary beneficiary of restaking-flywheel and points-frenzy." },
  { slug: "jupiter", name: "Jupiter", category: "DEX", token: "JUP", tvl: 210_000_000, vol: 1_150_000_000, sent: 0.28, launch: "2021-09-01", desc: "Solana aggregator; community-first airdrop widely studied." },
  { slug: "raydium", name: "Raydium", category: "DEX", token: "RAY", tvl: 480_000_000, vol: 830_000_000, sent: 0.19, launch: "2021-02-21", desc: "Solana AMM; memecoin volume surges drive fee spikes." },
  { slug: "drift", name: "Drift", category: "Perps", token: "DRIFT", tvl: 190_000_000, vol: 740_000_000, sent: 0.09, launch: "2022-04-25", desc: "Solana perps; insurance-fund staking flywheel." },
  { slug: "gmx", name: "GMX", category: "Perps", token: "GMX", tvl: 330_000_000, vol: 410_000_000, sent: -0.04, launch: "2021-09-22", desc: "Real-yield pioneer; mature but saturated." },
  { slug: "dydx", name: "dYdX", category: "Perps", token: "DYDX", tvl: 260_000_000, vol: 520_000_000, sent: -0.1, launch: "2019-02-25", desc: "Cosmos appchain migration completed; incentives war ongoing." },
  { slug: "celestia", name: "Celestia", category: "L1", token: "TIA", tvl: 420_000_000, vol: 230_000_000, sent: 0.06, launch: "2023-10-31", desc: "Modular DA; large November unlock is the standing overhang case." },
  { slug: "injective", name: "Injective", category: "L1", token: "INJ", tvl: 380_000_000, vol: 300_000_000, sent: 0.04, launch: "2020-10-21", desc: "Finance-specific L1; burn auction cadence." },
  { slug: "sui", name: "Sui", category: "L1", token: "SUI", tvl: 1_150_000_000, vol: 980_000_000, sent: 0.33, launch: "2023-05-03", desc: "Move-based L1; strong narrative momentum window." },
  { slug: "aptos", name: "Aptos", category: "L1", token: "APT", tvl: 540_000_000, vol: 340_000_000, sent: -0.02, launch: "2022-10-18", desc: "Move-based L1; VC-heavy cap table shapes unlock behavior." },
  { slug: "sei", name: "Sei", category: "L1", token: "SEI", tvl: 240_000_000, vol: 210_000_000, sent: -0.06, launch: "2023-08-15", desc: "Trading-optimized L1; EVM pivot decision is the key fork." },
  { slug: "pyth", name: "Pyth", category: "Oracles", token: "PYTH", tvl: 130_000_000, vol: 96_000_000, sent: 0.07, launch: "2023-11-20", desc: "First-party oracle network; multi-chain distribution lead." },
  { slug: "chainlink", name: "Chainlink", category: "Oracles", token: "LINK", tvl: 900_000_000, vol: 640_000_000, sent: 0.12, launch: "2017-09-20", desc: "Oracle incumbent; CCIP is the growth vector." },
  { slug: "ethena-clone", name: "Usual", category: "Yield", token: "USUAL", tvl: 760_000_000, vol: 180_000_000, sent: 0.16, launch: "2024-07-01", desc: "RWA-backed stablecoin yield; closest analog to Ethena's bootstrapping." },
];

/**
 * Generate a 90-day metric series.
 * Baseline is mean-reverting (tight AR(1) around the anchor) so the trailing
 * 30-day mean/std tracks it closely and the natural z-scores stay well under 2.
 * An optional anomaly injects a genuine level-shift over the last 5 days, which
 * then stands cleanly beyond ±2σ — exactly what The Sentinel hunts for.
 */
function genSeries(rnd: () => number, tvl: number, vol: number, sent: number, anomaly?: { metric: "tvl" | "volume" | "sentiment"; z: number }): MetricPoint[] {
  const pts: MetricPoint[] = [];
  const days = 90;
  const now = Date.UTC(2026, 7, 10); // demo "today"
  const anomalyStart = days - 5;

  // anchors (slightly randomized steady-state levels)
  const baseT = tvl * range(rnd, 0.85, 1.0);
  const baseV = vol * range(rnd, 0.85, 1.05);
  const baseS = Math.max(-0.85, Math.min(0.85, sent));

  let t = baseT;
  let v = baseV;
  let s = baseS;

  for (let i = 0; i < days; i++) {
    // mean-reversion pull toward anchor + small daily noise
    t = t + (baseT - t) * 0.12 + baseT * range(rnd, -0.012, 0.012);
    v = v + (baseV - v) * 0.14 + baseV * range(rnd, -0.02, 0.02);
    s = Math.max(-0.95, Math.min(0.95, s + (baseS - s) * 0.15 + range(rnd, -0.012, 0.012)));

    if (anomaly && i >= anomalyStart) {
      const k = (i - anomalyStart + 1) / 5; // ramps 0.2 → 1.0 across the window
      if (anomaly.metric === "tvl") t = t * (1 + anomaly.z * 0.035 * k);
      if (anomaly.metric === "volume") v = v * (1 + anomaly.z * 0.07 * k);
      if (anomaly.metric === "sentiment") s = Math.max(-0.97, Math.min(0.97, s + anomaly.z * 0.05 * k));
    }

    pts.push({
      t: new Date(now - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
      tvl: Math.round(t),
      volume: Math.round(v),
      sentiment: round(s, 3),
    });
  }
  return pts;
}

function slugify(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SYNTH_PREFIX = ["Alpha", "Astra", "Nova", "Zero", "Flux", "Prime", "Vertex", "Quantum", "Nimbus", "Helix", "Orbit", "Zenith", "Ion", "Pulse", "Delta", "Onyx", "Vega", "Solace", "Krait", "Mira"];
const SYNTH_SUFFIX = ["Swap", "Finance", "Lend", "Yield", "X", "Layer", "Perp", "Bridge", "Markets", "Labs", "DAO", "Stake", "Vault", "Protocol", "Network"];

export interface SeedData {
  users: UserRow[];
  projects: ProjectRow[];
  patterns: PatternRow[];
  knowledge: KnowledgeRow[];
  events: EventRow[];
  signals: SignalRow[];
  entities: EntityRow[];
  narratives: NarrativeRow[];
  conflicts: ConflictRow[];
  povMatrix: PovRow[];
  airdrops: AirdropRow[];
  templates: TemplateRow[];
  drafts: DraftRow[];
  alerts: AlertRow[];
  watchlists: WatchlistRow[];
  usageEvents: { id: string; userId: string; kind: string; createdAt: string }[];
  anomalyLogs: AnomalyLogRow[];
  actorClaims: ActorClaimRow[];
  narrativeEvidence: NarrativeEvidenceRow[];
  featureVectors: Map<string, number[]>; // projectId → 43-d vector (populated at store init)
  simulations: SimulationRow[];
  cif: import("@/lib/cif/types").CifDataset | null; // locked INTENT dataset (vendored cif-export/1)
  cifLinks: Map<string, string>; // app slug → CIF dataset key (display name)
  auditLogs: { id: string; actorId?: string; actorEmail?: string; action: string; resource?: string; meta?: Record<string, unknown>; ip?: string; createdAt: string }[];
  apiKeys: { id: string; userId: string; label: string; keyHash: string; scopes: string[]; revoked: boolean; createdAt: string }[];
  calibrationCalls: CalibrationCall[];
  notifications: NotificationRow[];
  xTokens: Map<string, { accessToken: string; obtainedAt: string }>;
  trackEvents: { id: string; event: string; meta: Record<string, unknown>; at: string }[];
  supportThreads: import("@/services/support/engine").SupportThread[];
  tickets: { id: string; userId: string; subject: string; status: string; createdAt: string; transcript: { role: string; text: string; at: string }[] }[];
  subscriptions: import("@/services/billing").SubscriptionRow[];
  payments: import("@/services/billing").PaymentRow[];
}

export function buildSeed(): SeedData {
  const rnd = mulberry32(0xc1f);
  const projects: ProjectRow[] = [];
  const bySlug = new Map<string, ProjectRow>();

  // Anomalies pre-injected so The Sentinel has exceptions on first load.
  const anomalySlugs: Record<string, { metric: "tvl" | "volume" | "sentiment"; z: number }> = {
    hyperliquid: { metric: "volume", z: 2.9 },
    ethena: { metric: "tvl", z: 2.4 },
    blur: { metric: "sentiment", z: -2.6 },
    celestia: { metric: "sentiment", z: -2.2 },
    pendle: { metric: "tvl", z: 2.3 },
  };

  // ── 29 named projects ──
  for (const p of NAMED_PROJECTS) {
    const pr = mulberry32(hashSeed(p.slug));
    const row: ProjectRow = {
      id: `p-${p.slug}`,
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.desc,
      tvlUsd: p.tvl,
      volume24hUsd: p.vol,
      sentiment: p.sent,
      launchDate: p.launch,
      tokenSymbol: p.token,
      isDemo: !!p.demo,
      hero: !!p.hero,
      series: genSeries(pr, p.tvl, p.vol, p.sent, anomalySlugs[p.slug]),
    };
    projects.push(row);
    bySlug.set(p.slug, row);
  }

  // ── 471 synthetic projects (the 500-project universe for The Sentinel) ──
  for (let i = 0; i < 471; i++) {
    const name = `${pick(rnd, SYNTH_PREFIX)} ${pick(rnd, SYNTH_SUFFIX)}`;
    const slug = `${slugify(name)}-${i}`;
    const cat = pick(rnd, CATEGORIES);
    const tvl = Math.round(range(rnd, 2, 900) * 1_000_000);
    const vol = Math.round(tvl * range(rnd, 0.05, 1.6));
    const sent = round(range(rnd, -0.5, 0.6), 2);
    const anomaly = rnd() < 0.012 ? { metric: pick(rnd, ["tvl", "volume", "sentiment"] as const), z: range(rnd, 2.1, 3.2) * (rnd() < 0.5 ? -1 : 1) } : undefined;
    projects.push({
      id: `p-${slug}`,
      slug,
      name,
      category: cat,
      description: `${cat} protocol in the INTENT 500 monitored universe.`,
      tvlUsd: tvl,
      volume24hUsd: vol,
      sentiment: sent,
      launchDate: new Date(Date.UTC(2018 + Math.floor(rnd() * 8), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27))).toISOString().slice(0, 10),
      tokenSymbol: rnd() < 0.7 ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4) : null,
      isDemo: false,
      hero: false,
      series: genSeries(mulberry32(hashSeed(slug)), tvl, vol, sent, anomaly),
    });
  }

  // ── Patterns ──
  const patterns: PatternRow[] = PATTERN_DEFS.map((p) => ({ id: `pat-${p.slug}`, ...p }));

  // ── Knowledge items — exactly 1,039 ──
  const knowledge: KnowledgeRow[] = [];
  const kTemplates = [
    (n: string, c: string) => `${n} TVL concentration: top-10 wallets hold ${Math.round(range(rnd, 8, 62))}% of deposits (${c} cohort analysis).`,
    (n: string) => `Tokenomics review: ${n} unlocks release ${round(range(rnd, 1, 9), 1)}% of circulating supply over the next 90 days.`,
    (n: string) => `${n} fee revenue covers ${Math.round(range(rnd, 4, 140))}% of emissions — sustainability ratio ${rnd() < 0.5 ? "below" : "above"} category median.`,
    (n: string) => `Developer activity on ${n}: ${Math.round(range(rnd, 3, 120))} weekly active committers, ${rnd() < 0.4 ? "declining" : "rising"} trend over 8 weeks.`,
    (n: string) => `Social graph: ${n} mention velocity up ${Math.round(range(rnd, 5, 300))}% WoW driven by ${pick(rnd, ["KOL cluster", "airdrop speculators", "research threads", "news catalyst"])}.`,
    (n: string) => `${n} bridge exposure: ${round(range(rnd, 2, 40), 1)}% of TVL dependent on a single external bridge contract.`,
    (n: string) => `Governance: largest ${n} voter controls ${round(range(rnd, 3, 46), 1)}% of exercised voting power.`,
    (n: string) => `${n} retention D30 = ${Math.round(range(rnd, 9, 61))}% of depositors — ${pick(rnd, ["mercenary", "sticky", "mixed"])} cohort signature.`,
  ];
  const sources = ["research", "onchain", "social", "docs"] as const;
  const tagPool = ["tokenomics", "tvl", "governance", "risk", "flows", "social", "dev-activity", "airdrop", "unlock", "fees"];
  let kCount = 0;
  const K_TOTAL = 1039;
  const perHero = 24;
  const heroes = projects.filter((p) => p.hero);
  for (const h of heroes) {
    for (let i = 0; i < perHero && kCount < K_TOTAL; i++, kCount++) {
      knowledge.push({
        id: `k-${kCount}`,
        projectId: h.id,
        source: pick(rnd, sources),
        statement: pick(rnd, kTemplates)(h.name, h.category),
        confidence: round(range(rnd, 0.45, 0.98), 2),
        tags: [pick(rnd, tagPool), pick(rnd, tagPool)].filter((v, ix, a) => a.indexOf(v) === ix),
      });
    }
  }
  // distribute the remainder across the full universe
  let pi = 0;
  while (kCount < K_TOTAL) {
    const p = projects[pi % projects.length];
    knowledge.push({
      id: `k-${kCount}`,
      projectId: p.id,
      source: pick(rnd, sources),
      statement: pick(rnd, kTemplates)(p.name, p.category),
      confidence: round(range(rnd, 0.35, 0.95), 2),
      tags: [pick(rnd, tagPool)],
    });
    kCount++;
    pi++;
  }

  // ── Decision events (Multiverse causal trees) ──
  const events: EventRow[] = [
    { id: "e-blur-1", projectId: "p-blur", parentId: null, title: "Blur seeds trading incentives vs. loyalty airdrops", kind: "decision", occurredAt: "2022-10-19T00:00:00Z", probability: 1, impact: { tvl: 0.3, sentiment: 0.4, volume: 0.9 } },
    { id: "e-blur-2", projectId: "p-blur", parentId: "e-blur-1", title: "Bid-to-earn farming attracts mercenary capital", kind: "outcome", occurredAt: "2023-02-14T00:00:00Z", probability: 0.85, impact: { tvl: 0.5, sentiment: 0.1, volume: 1.2 } },
    { id: "e-blur-3", projectId: "p-blur", parentId: "e-blur-2", title: "Season-2 loan airdrop extends points meta", kind: "decision", occurredAt: "2023-07-13T00:00:00Z", probability: 0.7, impact: { tvl: 0.4, sentiment: 0, volume: 0.6 } },
    { id: "e-blur-4", projectId: "p-blur", parentId: "e-blur-3", title: "38% of claimants exit within 7 days (vesting-cliff-dump)", kind: "outcome", occurredAt: "2024-02-27T00:00:00Z", probability: 0.71, impact: { tvl: -0.15, sentiment: -0.5, volume: 0.8 } },
    { id: "e-blur-5", projectId: "p-blur", parentId: "e-blur-4", title: "Counter-factual: 6-month linear vesting chosen instead", kind: "decision", occurredAt: "2024-02-27T00:00:00Z", probability: 0.3, impact: { tvl: 0.1, sentiment: 0.2, volume: -0.3 } },
    { id: "e-eig-1", projectId: "p-eigenlayer", parentId: null, title: "EigenLayer introduces slashable restaking", kind: "decision", occurredAt: "2023-06-12T00:00:00Z", probability: 1, impact: { tvl: 0.9, sentiment: 0.5, volume: 0.4 } },
    { id: "e-eig-2", projectId: "p-eigenlayer", parentId: "e-eig-1", title: "LRT wrappers compound points demand", kind: "outcome", occurredAt: "2023-11-01T00:00:00Z", probability: 0.8, impact: { tvl: 0.7, sentiment: 0.3, volume: 0.5 } },
    { id: "e-eig-3", projectId: "p-eigenlayer", parentId: "e-eig-2", title: "AVS slashing activated vs. deferred", kind: "decision", occurredAt: "2024-04-09T00:00:00Z", probability: 0.55, impact: { tvl: 0.2, sentiment: -0.1, volume: 0.2 } },
    { id: "e-eig-4", projectId: "p-eigenlayer", parentId: "e-eig-3", title: "Leverage unwind shock scenario", kind: "catalyst", occurredAt: "2024-08-05T00:00:00Z", probability: 0.25, impact: { tvl: -0.4, sentiment: -0.6, volume: 0.9 } },
    { id: "e-hl-1", projectId: "p-hyperliquid", parentId: null, title: "Hyperliquid skips VC round, community-only airdrop", kind: "decision", occurredAt: "2023-06-01T00:00:00Z", probability: 1, impact: { tvl: 0.4, sentiment: 0.6, volume: 0.7 } },
    { id: "e-hl-2", projectId: "p-hyperliquid", parentId: "e-hl-1", title: "Points season compounds organic flow", kind: "outcome", occurredAt: "2024-03-25T00:00:00Z", probability: 0.75, impact: { tvl: 0.8, sentiment: 0.4, volume: 1.1 } },
    { id: "e-hl-3", projectId: "p-hyperliquid", parentId: "e-hl-2", title: "TGE with no insider allocation", kind: "decision", occurredAt: "2024-11-29T00:00:00Z", probability: 0.9, impact: { tvl: 0.3, sentiment: 0.7, volume: 1.6 } },
  ];

  // ── Signals ──
  const signals: SignalRow[] = [
    { id: "s-1", projectId: "p-hyperliquid", type: "whale_accumulation", strength: 0.87, payload: { wallets: 14, horizon: "21d", note: "Top-50 share +3.1% while price flat" }, detectedAt: "2026-08-08T09:00:00Z" },
    { id: "s-2", projectId: "p-celestia", type: "unlock_overhang", strength: 0.74, payload: { unlockPctCirc: 11.2, date: "2026-08-31" }, detectedAt: "2026-08-07T14:00:00Z" },
    { id: "s-3", projectId: "p-blur", type: "sentiment_shift", strength: 0.66, payload: { delta7d: -0.18, drivers: ["farmer cohort churn", "floor decay"] }, detectedAt: "2026-08-09T20:00:00Z" },
    { id: "s-4", projectId: "p-ethena", type: "tvl_looping", strength: 0.71, payload: { inflationFactor: 1.42, note: "sUSDe recursive collateral" }, detectedAt: "2026-08-06T11:00:00Z" },
    { id: "s-5", projectId: "p-eigenlayer", type: "pattern_match", strength: 0.69, payload: { pattern: "restaking-flywheel", phase: "compounding" }, detectedAt: "2026-08-05T08:00:00Z" },
    { id: "s-6", projectId: "p-lido", type: "governance_concentration", strength: 0.58, payload: { topVoterPct: 43 }, detectedAt: "2026-08-04T16:00:00Z" },
  ];

  // ── Entities (The Origin — actor credibility) ──
  const entities: EntityRow[] = [
    { id: "ent-paradigm", name: "Paradigm", kind: "fund", credibilityScore: 88, trackRecord: { wins: 31, losses: 7, calls: 38 }, conflicts: ["Investor in Blur, EigenLayer"], stances: [{ narrativeId: "n-restaking", stance: 0.8 }] },
    { id: "ent-ansem", name: "Ansem (KOL)", kind: "kol", credibilityScore: 61, trackRecord: { wins: 18, losses: 12, calls: 30 }, conflicts: ["Paid promotions undisclosed ×2"], stances: [{ narrativeId: "n-perps", stance: 0.9 }, { narrativeId: "n-points", stance: 0.6 }] },
    { id: "ent-defillama", name: "DefiLlama Research", kind: "protocol", credibilityScore: 93, trackRecord: { wins: 44, losses: 3, calls: 47 }, conflicts: [], stances: [{ narrativeId: "n-tvl-quality", stance: 0.7 }] },
    { id: "ent-whale0x", name: "0x3a...9f2 (Whale)", kind: "whale", credibilityScore: 72, trackRecord: { wins: 9, losses: 4, calls: 13 }, conflicts: ["Position visible on-chain → self-serving signals"], stances: [{ narrativeId: "n-perps", stance: 0.5 }] },
    { id: "ent-arthur0x", name: "arthur0x (KOL)", kind: "kol", credibilityScore: 77, trackRecord: { wins: 22, losses: 9, calls: 31 }, conflicts: ["Holds disclosed positions in cited tokens"], stances: [{ narrativeId: "n-restaking", stance: 0.4 }] },
    { id: "ent-binance-research", name: "Binance Research", kind: "protocol", credibilityScore: 74, trackRecord: { wins: 27, losses: 11, calls: 38 }, conflicts: ["Listing pipeline conflicts"], stances: [{ narrativeId: "n-lowfloat", stance: -0.2 }] },
    { id: "ent-ethena-team", name: "Ethena Labs Team", kind: "team", credibilityScore: 69, trackRecord: { wins: 6, losses: 2, calls: 8 }, conflicts: ["Direct token exposure", "Controls TVL reporting methodology"], stances: [{ narrativeId: "n-tvl-quality", stance: -0.5 }] },
    { id: "ent-lido-labs", name: "Lido Labs", kind: "team", credibilityScore: 81, trackRecord: { wins: 14, losses: 3, calls: 17 }, conflicts: ["Node-operator selection power"], stances: [] },
    { id: "ent-cobie", name: "cobie (KOL)", kind: "kol", credibilityScore: 83, trackRecord: { wins: 19, losses: 5, calls: 24 }, conflicts: [], stances: [{ narrativeId: "n-points", stance: -0.6 }] },
    { id: "ent-galaxy", name: "Galaxy Digital", kind: "fund", credibilityScore: 70, trackRecord: { wins: 16, losses: 8, calls: 24 }, conflicts: ["Market-making desk"], stances: [] },
  ];

  // ── Narratives (Truth Matrix rows) ──
  const narratives: NarrativeRow[] = [
    { id: "n-restaking", title: "Restaking is net-positive for ETH security", heat: 0.72, evidence: { onchain: 0.8, docs: 0.6, social: 0.7, insider: 0.4 } },
    { id: "n-points", title: "Points programs reflect organic demand", heat: 0.85, evidence: { onchain: 0.35, docs: 0.2, social: 0.9, insider: 0.3 } },
    { id: "n-perps", title: "On-chain perps flip CEX volume by 2028", heat: 0.66, evidence: { onchain: 0.7, docs: 0.4, social: 0.75, insider: 0.5 } },
    { id: "n-tvl-quality", title: "Reported TVL ≈ unique underlying assets", heat: 0.41, evidence: { onchain: 0.3, docs: 0.5, social: 0.35, insider: 0.25 } },
    { id: "n-lowfloat", title: "Low-float launches protect early holders", heat: 0.58, evidence: { onchain: 0.65, docs: 0.55, social: 0.8, insider: 0.6 } },
    { id: "n-modular", title: "Modular DA captures L2 value", heat: 0.49, evidence: { onchain: 0.5, docs: 0.65, social: 0.6, insider: 0.35 } },
    { id: "n-airdrop-meta", title: "Airdrop farming is dying post-sybil-screening", heat: 0.53, evidence: { onchain: 0.75, docs: 0.3, social: 0.55, insider: 0.45 } },
    { id: "n-rwa", title: "RWA collateral de-risks stablecoin yield", heat: 0.44, evidence: { onchain: 0.55, docs: 0.7, social: 0.5, insider: 0.4 } },
  ];

  // ── Conflicts ──
  const conflicts: ConflictRow[] = [
    { id: "c-1", projectAId: "p-ethena", projectBId: "p-lido", narrative: "Both claim 'risk-free yield' labeling while carrying correlated liquidation paths.", severity: "high" },
    { id: "c-2", projectAId: "p-zksync", projectBId: "p-starknet", narrative: "Competing 'ZK endgame' claims with incompatible validity-proof roadmaps.", severity: "medium" },
    { id: "c-3", projectAId: "p-hyperliquid", projectBId: "p-dydx", narrative: "Conflicting volume methodologies (matched notional vs. wash-filtered).", severity: "medium" },
  ];

  // ── POV Matrix + Airdrops (Content Studio data source) ──
  const povMatrix: PovRow[] = [
    // Blur — the flagship case: "38% of recipients sold within 7 days"
    { projectId: "p-blur", segment: "retail", allocationPct: 18, sold7dPct: 52, sold30dPct: 71, holdingPct: 29, avgClaimUsd: 1_150 },
    { projectId: "p-blur", segment: "vc", allocationPct: 29, sold7dPct: 9, sold30dPct: 24, holdingPct: 76, avgClaimUsd: 4_800_000 },
    { projectId: "p-blur", segment: "whale", allocationPct: 21, sold7dPct: 44, sold30dPct: 58, holdingPct: 42, avgClaimUsd: 96_000 },
    { projectId: "p-blur", segment: "farmers", allocationPct: 27, sold7dPct: 68, sold30dPct: 84, holdingPct: 16, avgClaimUsd: 7_400 },
    { projectId: "p-blur", segment: "team", allocationPct: 5, sold7dPct: 0, sold30dPct: 0, holdingPct: 100, avgClaimUsd: 0 },
    { projectId: "p-arbitrum", segment: "retail", allocationPct: 19, sold7dPct: 41, sold30dPct: 59, holdingPct: 41, avgClaimUsd: 830 },
    { projectId: "p-arbitrum", segment: "vc", allocationPct: 17, sold7dPct: 6, sold30dPct: 19, holdingPct: 81, avgClaimUsd: 2_100_000 },
    { projectId: "p-arbitrum", segment: "whale", allocationPct: 14, sold7dPct: 33, sold30dPct: 47, holdingPct: 53, avgClaimUsd: 61_000 },
    { projectId: "p-arbitrum", segment: "farmers", allocationPct: 38, sold7dPct: 57, sold30dPct: 76, holdingPct: 24, avgClaimUsd: 3_900 },
    { projectId: "p-arbitrum", segment: "team", allocationPct: 12, sold7dPct: 0, sold30dPct: 0, holdingPct: 100, avgClaimUsd: 0 },
    { projectId: "p-jupiter", segment: "retail", allocationPct: 40, sold7dPct: 29, sold30dPct: 44, holdingPct: 56, avgClaimUsd: 1_310 },
    { projectId: "p-jupiter", segment: "vc", allocationPct: 0, sold7dPct: 0, sold30dPct: 0, holdingPct: 100, avgClaimUsd: 0 },
    { projectId: "p-jupiter", segment: "whale", allocationPct: 19, sold7dPct: 26, sold30dPct: 39, holdingPct: 61, avgClaimUsd: 44_000 },
    { projectId: "p-jupiter", segment: "farmers", allocationPct: 29, sold7dPct: 48, sold30dPct: 67, holdingPct: 33, avgClaimUsd: 2_700 },
    { projectId: "p-jupiter", segment: "team", allocationPct: 12, sold7dPct: 0, sold30dPct: 0, holdingPct: 100, avgClaimUsd: 0 },
    { projectId: "p-eigenlayer", segment: "retail", allocationPct: 25, sold7dPct: 31, sold30dPct: 49, holdingPct: 51, avgClaimUsd: 2_200 },
    { projectId: "p-eigenlayer", segment: "vc", allocationPct: 32, sold7dPct: 4, sold30dPct: 15, holdingPct: 85, avgClaimUsd: 7_600_000 },
    { projectId: "p-eigenlayer", segment: "whale", allocationPct: 18, sold7dPct: 27, sold30dPct: 42, holdingPct: 58, avgClaimUsd: 130_000 },
    { projectId: "p-eigenlayer", segment: "farmers", allocationPct: 20, sold7dPct: 55, sold30dPct: 73, holdingPct: 27, avgClaimUsd: 9_100 },
    { projectId: "p-eigenlayer", segment: "team", allocationPct: 5, sold7dPct: 0, sold30dPct: 0, holdingPct: 100, avgClaimUsd: 0 },
  ];

  const airdrops: AirdropRow[] = [
    { projectId: "p-blur", token: "BLUR", droppedUsd: 430_000_000, claimants: 127_000, claimPct: 96, sellPressure7dPct: 38, sybilPct: 11 },
    { projectId: "p-arbitrum", token: "ARB", droppedUsd: 1_200_000_000, claimants: 620_000, claimPct: 92, sellPressure7dPct: 33, sybilPct: 19 },
    { projectId: "p-jupiter", token: "JUP", droppedUsd: 500_000_000, claimants: 950_000, claimPct: 95, sellPressure7dPct: 24, sybilPct: 8 },
    { projectId: "p-eigenlayer", token: "EIGEN", droppedUsd: 780_000_000, claimants: 210_000, claimPct: 89, sellPressure7dPct: 27, sybilPct: 6 },
    { projectId: "p-zksync", token: "ZK", droppedUsd: 620_000_000, claimants: 410_000, claimPct: 78, sellPressure7dPct: 46, sybilPct: 27 },
    { projectId: "p-starknet", token: "STRK", droppedUsd: 540_000_000, claimants: 380_000, claimPct: 81, sellPressure7dPct: 42, sybilPct: 22 },
  ];

  // ── Content templates (FASE 5 system prompts live here) ──
  const templates: TemplateRow[] = [
    {
      id: "tpl-thread-analyst",
      name: "Thread Analyst",
      description: "6-tweet data thread for X. Hook → POV breakdown → causal 'why' → prediction.",
      systemPrompt: `You are "INTENT Analyst", a senior crypto researcher known for data-backed, unbiased insights.
Your task is to write a Twitter thread based on the provided dataset.
Structure:
1. Hook (1 tweet): A surprising statistic that grabs attention.
2. The Data (3 tweets): Explain the POV breakdown (Retail vs VC).
3. The "Why" (1 tweet): Connect to the specific Decision Event (e.g., "vesting lock").
4. Conclusion (1 tweet): Predict similar outcome for upcoming projects.
Tone: Professional, firm, factual. No hype. No emojis except for bullet points.
Add source references at the end.`,
      format: { structure: ["hook", "data", "why", "conclusion"] },
    },
    {
      id: "tpl-tldr",
      name: "TL;DR",
      description: "3-bullet executive snapshot. Maximum information density, zero fluff.",
      systemPrompt: `You are "INTENT Analyst", a senior crypto researcher. Compress the provided dataset into a TL;DR briefing.
Structure:
1. WHAT — one line with the single most important number.
2. SO-WHAT — one line on the causal mechanism.
3. NOW-WHAT — one line forward-looking implication.
Tone: Professional, firm, factual. No hype, no emojis. Cite the dataset fields you used.`,
      format: { structure: ["what", "so_what", "now_what"] },
    },
    {
      id: "tpl-data-drop",
      name: "Data Drop",
      description: "Single hard-hitting stat post with a mini table, built to pair with a Truth Card image.",
      systemPrompt: `You are "INTENT Analyst", a senior crypto researcher. Write a single "Data Drop" post.
Structure:
1. One arresting sentence anchored to ONE headline statistic from the dataset.
2. A compact markdown table comparing at most 3 segments or projects.
3. One-line methodology footnote (sample, window, source).
Tone: Professional, firm, factual. No hype. No emojis except bullet points. Add source references.`,
      format: { structure: ["headline_stat", "table", "methodology"] },
    },
    {
      id: "tpl-linkedin-brief",
      name: "LinkedIn Brief",
      description: "Long-form professional analysis for LinkedIn / research newsletters.",
      systemPrompt: `You are "INTENT Analyst", a senior crypto researcher writing for an institutional audience.
Write a LinkedIn-style brief (250-400 words) with: a factual headline, 3 short sections (Context, Evidence, Implications), and a closing takeaway.
Use precise numbers from the dataset, name the pattern (e.g., "vesting-cliff-dump") and reference the Decision Event that caused the observed behavior.
Tone: professional, measured, zero hype, no emojis.`,
      format: { structure: ["headline", "context", "evidence", "implications", "takeaway"] },
    },
  ];

  // ── Demo user, watchlist, seed draft ──
  // ── Demo enterprise accounts (roles + scrypt-hashed creds, see docs/API.md) ──
  const DEMO_HASH =
    "scrypt:cif-demo-salt:c308b99ffdd6aa3f4d0132b96b0c120732afceff627fead2d82285bc6d7cc32c1beda59062393f2ab16fcf81839b9bce47ae69d9d9a0d6b3b6c89d26b787e678";
  const users: UserRow[] = [
    { id: "u-demo", email: "admin@cif.local", name: "Demo Admin", plan: "pro", role: "admin", passwordHash: DEMO_HASH },
    { id: "u-analyst", email: "analyst@cif.local", name: "Demo Analyst", plan: "pro", role: "analyst", passwordHash: DEMO_HASH },
    { id: "u-viewer", email: "viewer@cif.local", name: "Demo Viewer", plan: "free", role: "viewer", passwordHash: DEMO_HASH },
  ];
  const watchlists: WatchlistRow[] = [
    { id: "w-1", userId: "u-demo", projectId: "p-blur", alertTriggers: { sentinel: true, airdrop: true, pattern_match: true } },
    { id: "w-2", userId: "u-demo", projectId: "p-hyperliquid", alertTriggers: { sentinel: true, airdrop: false, pattern_match: true } },
    { id: "w-3", userId: "u-demo", projectId: "p-eigenlayer", alertTriggers: { sentinel: true, airdrop: true, pattern_match: false } },
  ];

  // ── Actor claims — the raw feed behind The Origin's credibility engine ──
  const claimStyles: Record<string, ((subj: string) => string)[]> = {
    kol: [
      (s) => `"${s} is massively undervalued vs its fee run-rate. Accumulating."`,
      (s) => `"Called the ${s} rotation two weeks before it happened."`,
      (s) => `"Not touching ${s} until the unlock overhang clears."`,
    ],
    fund: [
      (s) => `Thesis published: "${s} captures the restaking value chain."`,
      (s) => `Position disclosed in letter: long ${s}, 18-month horizon.`,
      (s) => `Internal memo leaked: fund trimmed ${s} at +140%.`,
    ],
    whale: [
      (s) => `Accumulated 4.2% of ${s} supply over 10 days (on-chain).`,
      (s) => `Rotated 60% of ${s} stack into perps hedge.`,
      (s) => `Wallet split: distributed ${s} across 14 fresh addresses.`,
    ],
    team: [
      (s) => `Roadmap claim: "${s} slashing live by Q3."`,
      (s) => `TVL methodology published for ${s} (self-reported).`,
      (s) => `Promised full reimbursement after the ${s} incident.`,
    ],
    protocol: [
      (s) => `Research note: ${s} unique-depositor ratio at 0.61.`,
      (s) => `Flag: ${s} reported TVL double-counts looped collateral.`,
      (s) => `Dataset: ${s} fee/revenue at 118% of emissions.`,
    ],
  };
  const subjects = ["restaking", "on-chain perps", "the points meta", "modular DA", "L2 incentives", "stablecoin yield", "the airdrop cycle"];
  const actorClaims: ActorClaimRow[] = [];
  let cIdx = 0;
  for (const e of entities) {
    const cr = mulberry32(hashSeed(e.id));
    const styles = claimStyles[e.kind] ?? claimStyles.kol;
    const emit = (outcome: ActorClaimRow["outcome"]) => {
      actorClaims.push({
        id: `cl-${cIdx++}`,
        actorId: e.id,
        claimText: pick(cr, styles)(pick(cr, subjects)),
        claimDate: new Date(Date.UTC(2025, Math.floor(cr() * 12), 1 + Math.floor(cr() * 27))).toISOString(),
        outcome,
        evidenceLink: `https://cif.local/evidence/${hashSeed(e.id + String(cIdx)).toString(16)}`,
        conflictOfInterest: e.conflicts.length > 0 && cr() < 0.4,
      });
    };
    for (let i = 0; i < e.trackRecord.wins; i++) emit("correct");
    for (let i = 0; i < e.trackRecord.losses; i++) emit("incorrect");
    emit("pending");
    emit("pending");
  }

  // ── Narrative evidence — normalized rows feeding the Truth Matrix ──
  const narrativeEvidence: NarrativeEvidenceRow[] = [];
  let evIdx = 0;
  for (const n of narratives) {
    for (const channel of ["onchain", "docs", "social", "insider"] as const) {
      narrativeEvidence.push({ id: `ev-${evIdx++}`, narrativeId: n.id, channel, value: n.evidence[channel], updatedAt: "2026-08-09T00:00:00Z" });
    }
  }

  // ── Past Sentinel scan logs ──
  const anomalyLogs: AnomalyLogRow[] = [
    { id: "al-1", mode: "interval", scannedProjects: 500, scannedMetrics: 1500, newAlerts: 4, threshold: 2, startedAt: "2026-08-10T00:00:00Z", finishedAt: "2026-08-10T00:00:12Z" },
    { id: "al-2", mode: "interval", scannedProjects: 500, scannedMetrics: 1500, newAlerts: 2, threshold: 2, startedAt: "2026-08-09T18:00:00Z", finishedAt: "2026-08-09T18:00:11Z" },
    { id: "al-3", mode: "bullmq", scannedProjects: 500, scannedMetrics: 1500, newAlerts: 6, threshold: 2, startedAt: "2026-08-09T12:00:00Z", finishedAt: "2026-08-09T12:00:14Z" },
  ];

  const drafts: DraftRow[] = [
    {
      id: "d-seed-1",
      userId: "u-demo",
      sourceType: "airdrop",
      sourceId: "p-blur",
      templateId: "tpl-thread-analyst",
      generatedContent: `1/ 38% of $BLUR recipients sold within 7 days of the Season-2 drop.\n\nNot panic. Structure. Here's the POV breakdown 🧵\n\n2/ Retail claimed 18% of supply and dumped 52% of it in week one. Farmers — 27% of supply — sold 68%. This cohort was never here for the protocol.\n\n3/ VCs held 29% of the drop and sold just 9%. Their cost basis is zero and their horizon is the unlock schedule, not the chart.\n\n4/ The causal fork: Blur chose instant claimability over vesting. Instant liquidity = instant exit liquidity. The vesting-cliff-dump pattern has a 71% historical base rate.\n\n5/ Prediction: every upcoming TGE without a lockup prints the same signature. Watch the claim-window, not the FDV.\n\n— Data: INTENT · POV Matrix · 127,000 claimants · Powered by INTENT`,
      editedContent: null,
      status: "published",
      shareUrl: "https://x.com/cif_demo/status/1800000000000000001",
      createdAt: "2026-08-02T10:00:00Z",
    },
  ];

  const simulations: SimulationRow[] = [];

  return {
    users, projects, patterns, knowledge, events, signals, entities, narratives, conflicts,
    povMatrix, airdrops, templates, drafts, alerts: [], watchlists, usageEvents: [],
    anomalyLogs, actorClaims, narrativeEvidence, featureVectors: new Map(), simulations,
    cif: null, cifLinks: new Map(),
    auditLogs: [],
    calibrationCalls: [
      {
        id: "cal-1",
        projectId: "p-ethena",
        statement: "Current Read: sUSDe loop-driven TVL inflation unwinds partially within 90 days if points emissions taper.",
        triggerCondition: "Ethena announces ≥30% emission taper AND 7d net TVL change < −10%.",
        patternConfidence: 0.7,
        trajectoryProbability: 0.55,
        asOfDate: "2026-06-01T00:00:00Z",
        resolveAfter: "2026-09-01T00:00:00Z",
        outcome: "pending",
        gradedAt: null,
        gradedBy: null,
      },
      {
        id: "cal-2",
        projectId: "p-blur",
        statement: "Season-2 claim cohort sells majority within 7 days (vesting-cliff-dump shape).",
        triggerCondition: "7-day sell-through of claimed supply > 35%.",
        patternConfidence: 0.8,
        trajectoryProbability: 0.75,
        asOfDate: "2024-02-20T00:00:00Z",
        resolveAfter: "2024-03-10T00:00:00Z",
        outcome: "pass",
        gradedAt: "2024-03-12T00:00:00Z",
        gradedBy: "u-demo",
      },
    ],
    notifications: [],
    xTokens: new Map(),
    trackEvents: [],
    supportThreads: [],
    tickets: [],
    subscriptions: [],
    payments: [],
    // demo programmatic key: raw = "cif_demo_key_2026" (sha256 below) — docs/API.md
    apiKeys: [
      {
        id: "ak-1",
        userId: "u-demo",
        label: "demo-integration",
        keyHash: "7866d7bc35841d55d68223c5d655252c5089dfa679118ab6f18cc1f7eb811060",
        scopes: ["read"],
        revoked: false,
        createdAt: "2026-08-01T00:00:00Z",
      },
    ],
  };
}

/** Exposed series generator so the CIF loader can attach Observable telemetry to catalog rows. */
export function makeSeries(rnd: () => number, tvl: number, vol: number, sent: number): MetricPoint[] {
  return genSeries(rnd, tvl, vol, sent);
}
