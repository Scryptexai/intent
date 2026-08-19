import { getStore } from "@/lib/store";
import { hashSeed, mulberry32 } from "@/lib/prng";
import { patternActivations } from "@/services/vectors";
import { logger, ServiceError } from "@/services/logger";
import { randomUUID } from "crypto";

/**
 * ── THE EDGE · Probabilistic Simulation Engine ─────────────────────────────
 * Continuous variable-based counter-factuals: the user drags a slider, we map
 * the value to a daily drift, then run 1,000 Monte-Carlo paths modulated by
 * the project's active pattern stack. Outcomes: distribution + min/median/max.
 */

export interface SimVariable {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  baseline: number;
  description: string;
}

export const SIM_VARIABLES: SimVariable[] = [
  { id: "vesting_period", label: "Vesting period", min: 0, max: 24, step: 1, unit: "months", baseline: 0, description: "Linear lock-up chosen at TGE instead of instant claimability." },
  { id: "airdrop_size", label: "Airdrop size boost", min: 0, max: 100, step: 5, unit: "%", baseline: 0, description: "Extra supply distributed to claimants." },
  { id: "allocation_percent", label: "Insider allocation", min: 0, max: 50, step: 1, unit: "%", baseline: 15, description: "Team + investor share of genesis supply." },
  { id: "market_shock", label: "Macro shock", min: -50, max: 0, step: 1, unit: "%", baseline: 0, description: "BTC drawdown applied to the whole path." },
  { id: "points_duration", label: "Points program length", min: 0, max: 18, step: 1, unit: "months", baseline: 6, description: "Duration of the incentive/points season." },
  { id: "volatility_regime", label: "Volatility regime", min: 0.5, max: 3, step: 0.25, unit: "×", baseline: 1, description: "Multiplier on per-path shock volatility — tests how the thesis survives turbulent markets." },
];

/**
 * Effect per unit away from baseline. Convention: drift = effect × Δvalue,
 * so for market_shock (Δ negative) the effect is positive to produce a
 * negative drift.
 */
const VAR_EFFECT: Record<string, { tvl: number; sentiment: number; volume: number; risk: number }> = {
  vesting_period: { tvl: 0.0011, sentiment: 0.006, volume: -0.0035, risk: 0.16 },
  airdrop_size: { tvl: 0.0009, sentiment: 0.001, volume: 0.0016, risk: 0.5 },
  allocation_percent: { tvl: -0.0012, sentiment: -0.004, volume: 0.0006, risk: 0.34 },
  market_shock: { tvl: 0.0045, sentiment: 0.008, volume: -0.003, risk: 0.75 },
  points_duration: { tvl: 0.0012, sentiment: 0.003, volume: 0.0014, risk: 0.4 },
  volatility_regime: { tvl: 0, sentiment: 0, volume: 0, risk: 0.1 },
};

export interface SimResult {
  projectId: string;
  variable: SimVariable;
  value: number;
  runs: number;
  distribution: { bucket: string; count: number; pct: number }[];
  expected: { tvlPct: number; sentimentDelta: number; volumePct: number };
  percentiles: { min: number; p10: number; p50: number; p90: number; max: number };
  patternExposure: { slug: string; name: string; activation: number }[];
}

export function runSimulation(projectId: string, variableId: string, value: number, runs = 1000): SimResult {
  const s = getStore();
  const project = s.projects.find((p) => p.id === projectId || p.slug === projectId);
  const variable = SIM_VARIABLES.find((v) => v.id === variableId);
  if (!project) throw new ServiceError("PROJECT_NOT_FOUND", `No project '${projectId}'`, 404);
  if (!variable) throw new ServiceError("VARIABLE_NOT_FOUND", `No variable '${variableId}'`, 400);
  if (!Number.isFinite(value)) throw new ServiceError("BAD_VALUE", "value must be a finite number", 400);
  // clamp into the slider's declared range — never trust client input
  const clamped = Math.min(variable.max, Math.max(variable.min, value));
  const eff = VAR_EFFECT[variableId];

  const delta = clamped - variable.baseline;
  const activations = patternActivations(s, project);
  const patternRisk = activations.reduce((a, v) => a + v, 0) / activations.length;
  const sigma = (0.009 + eff.risk * 0.018 + patternRisk * 0.012) * (variableId === "volatility_regime" ? clamped : 1);
  const rnd = mulberry32(hashSeed(`${projectId}:${variableId}:${value}`));

  const outcomes: number[] = [];
  for (let r = 0; r < runs; r++) {
    let mult = 1;
    for (let d = 0; d < 30; d++) {
      const shock = gauss(rnd) * sigma;
      mult *= 1 + eff.tvl * delta * 0.06 + shock * 0.6;
    }
    outcomes.push((mult - 1) * 100);
  }
  outcomes.sort((a, b) => a - b);
  const p = (q: number) => outcomes[Math.min(outcomes.length - 1, Math.floor(q * outcomes.length))];
  const mean = outcomes.reduce((a, b) => a + b, 0) / runs;

  const lo = Math.floor(outcomes[0] / 5) * 5;
  const hi = Math.ceil(outcomes[outcomes.length - 1] / 5) * 5;
  const distribution: { bucket: string; count: number; pct: number }[] = [];
  for (let b = lo; b < hi; b += 5) {
    const count = outcomes.filter((o) => o >= b && o < b + 5).length;
    distribution.push({ bucket: `${b > 0 ? "+" : ""}${b}%`, count, pct: Math.round((count / runs) * 1000) / 10 });
  }

  const patternExposure = s.patterns
    .map((pat, i) => ({ slug: pat.slug, name: pat.name, activation: activations[i] }))
    .filter((x) => x.activation >= 0.3)
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 5);

  logger.info("edge", "simulation", { project: project.slug, variable: variableId, value: clamped, median: Math.round(p(0.5) * 10) / 10 });

  return {
    projectId: project.id,
    variable,
    value: clamped,
    runs,
    distribution,
    expected: {
      tvlPct: Math.round(mean * 10) / 10,
      sentimentDelta: Math.round(eff.sentiment * delta * 100) / 100,
      volumePct: Math.round(eff.volume * delta * 1000) / 10,
    },
    percentiles: {
      min: Math.round(outcomes[0] * 10) / 10,
      p10: Math.round(p(0.1) * 10) / 10,
      p50: Math.round(p(0.5) * 10) / 10,
      p90: Math.round(p(0.9) * 10) / 10,
      max: Math.round(outcomes[outcomes.length - 1] * 10) / 10,
    },
    patternExposure,
  };
}

export function saveSimulation(args: { userId: string; projectId: string; variable: string; value: number; result: SimResult }) {
  const s = getStore();
  const row = {
    id: randomUUID(),
    userId: args.userId,
    projectId: args.projectId,
    variable: args.variable,
    value: args.value,
    result: {
      expectedTvlPct: args.result.expected.tvlPct,
      p10: args.result.percentiles.p10,
      p50: args.result.percentiles.p50,
      p90: args.result.percentiles.p90,
    },
    shareToken: randomUUID().replace(/-/g, "").slice(0, 12),
    createdAt: new Date().toISOString(),
  };
  s.simulations.unshift(row);
  logger.info("edge", "simulation saved", { id: row.id, shareToken: row.shareToken });
  return row;
}

export function listSimulations(projectId?: string) {
  const s = getStore();
  const rows = projectId ? s.simulations.filter((x) => x.projectId === projectId) : s.simulations;
  const byId = new Map(s.projects.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, projectName: byId.get(r.projectId)?.name ?? "?" }));
}

function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9);
  const v = Math.max(rnd(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
