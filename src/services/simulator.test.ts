import { describe, expect, it } from "vitest";
import { runSimulation, saveSimulation, listSimulations, SIM_VARIABLES } from "@/services/simulator";

describe("simulator (The Edge)", () => {
  it("exposes the 5 sandbox variables with sane ranges", () => {
    expect(SIM_VARIABLES).toHaveLength(5);
    for (const v of SIM_VARIABLES) {
      expect(v.min).toBeLessThan(v.max);
      expect(v.step).toBeGreaterThan(0);
    }
  });

  it("produces an ordered distribution with min <= p10 <= p50 <= p90 <= max", () => {
    const r = runSimulation("p-blur", "vesting_period", 12);
    expect(r.distribution.length).toBeGreaterThan(0);
    const { min, p10, p50, p90, max } = r.percentiles;
    expect(min <= p10 && p10 <= p50 && p50 <= p90 && p90 <= max).toBe(true);
    expect(r.runs).toBe(1000);
  });

  it("market shock shifts the median negative vs vesting extension", () => {
    const shock = runSimulation("p-ethena", "market_shock", -30);
    const vest = runSimulation("p-ethena", "vesting_period", 12);
    expect(shock.percentiles.p50).toBeLessThan(vest.percentiles.p50);
  });

  it("is deterministic for identical inputs", () => {
    const a = runSimulation("p-blur", "airdrop_size", 50);
    const b = runSimulation("p-blur", "airdrop_size", 50);
    expect(a.percentiles).toEqual(b.percentiles);
  });

  it("saves simulations with a share token and lists them", () => {
    const r = runSimulation("p-blur", "vesting_period", 6);
    const row = saveSimulation({ userId: "u-demo", projectId: r.projectId, variable: "vesting_period", value: 6, result: r });
    expect(row.shareToken).toMatch(/^[a-f0-9]{12}$/);
    expect(listSimulations(r.projectId).some((x) => x.id === row.id)).toBe(true);
  });

  it("throws on unknown variable / project", () => {
    expect(() => runSimulation("p-blur", "nope", 1)).toThrow();
    expect(() => runSimulation("p-nope", "vesting_period", 1)).toThrow();
  });

  it("clamps out-of-range values into the variable's declared bounds (hardening)", () => {
    const over = runSimulation("p-blur", "vesting_period", 9999);
    expect(over.value).toBe(24); // max months
    const under = runSimulation("p-blur", "market_shock", -500);
    expect(under.value).toBe(-50); // min shock
    expect(() => runSimulation("p-blur", "vesting_period", Number.NaN)).toThrow();
  });
});
