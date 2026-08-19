import { describe, expect, it } from "vitest";
import { actorReports, getActorCredibility, actorClaims } from "@/services/actor-credibility";
import { getStore } from "@/lib/store";

describe("actor-credibility (The Origin)", () => {
  it("computes reliability within 0..100 for every actor", () => {
    for (const r of actorReports()) {
      expect(r.reliability).toBeGreaterThanOrEqual(0);
      expect(r.reliability).toBeLessThanOrEqual(100);
    }
  });

  it("hit-rate matches the seeded track record", () => {
    const s = getStore();
    const defillama = s.entities.find((e) => e.name.includes("DefiLlama"))!;
    const r = getActorCredibility(defillama.id);
    const expected = defillama.trackRecord.wins / defillama.trackRecord.calls;
    expect(r.hitRate).toBeCloseTo(expected, 1);
  });

  it("high-conflict actors score below clean researchers", () => {
    const s = getStore();
    const clean = getActorCredibility(s.entities.find((e) => e.name.includes("DefiLlama"))!.id);
    const conflicted = getActorCredibility(s.entities.find((e) => e.name.includes("Ethena Labs"))!.id);
    expect(clean.reliability).toBeGreaterThan(conflicted.reliability);
  });

  it("claim history includes correct + incorrect + pending rows", () => {
    const s = getStore();
    const actor = s.entities[0];
    const claims = actorClaims(actor.id);
    expect(claims.some((c) => c.outcome === "correct")).toBe(true);
    expect(claims.some((c) => c.outcome === "incorrect")).toBe(true);
    expect(claims.some((c) => c.outcome === "pending")).toBe(true);
    expect(claims.length).toBe(actor.trackRecord.calls + 2);
  });

  it("throws on unknown actor", () => {
    expect(() => getActorCredibility("ent-nope")).toThrow();
  });
});
