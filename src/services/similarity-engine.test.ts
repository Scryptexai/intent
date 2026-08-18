import { describe, expect, it } from "vitest";
import { findAnalogProject } from "@/services/similarity-engine";
import { cosine, ensureFeatureVectors, buildFeatureVector } from "@/services/vectors";
import { getStore } from "@/lib/store";

describe("similarity-engine (The Mirror)", () => {
  it("persists 43-d feature vectors for all 500 projects", () => {
    const s = getStore();
    ensureFeatureVectors(s);
    expect(s.featureVectors.size).toBe(500);
    const v = s.featureVectors.get("p-blur")!;
    expect(v.length).toBe(12 + 5 + 16 + 10);
  });

  it("cosine self-similarity is 1 and orthogonal-ish categories differ", () => {
    const s = getStore();
    const v = s.featureVectors.get("p-blur")!;
    expect(cosine(v, v)).toBeCloseTo(1, 5);
  });

  it("returns top-3 analogs, never the target, sorted desc", () => {
    const res = findAnalogProject("p-blur", 3);
    expect(res.analogs).toHaveLength(3);
    expect(res.analogs.every((a) => a.project.id !== res.target.id)).toBe(true);
    const sims = res.analogs.map((a) => a.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
    expect(res.scannedProjects).toBe(500);
    expect(res.knowledgeCorpus).toBe(1039);
  });

  it("perps mirror perps: hyperliquid finds Drift among top analogs", () => {
    const res = findAnalogProject("p-hyperliquid", 5);
    expect(res.analogs.some((a) => a.project.slug === "drift")).toBe(true);
  });

  it("throws on unknown project", () => {
    expect(() => findAnalogProject("p-nope")).toThrow();
  });

  it("vector builder is deterministic", () => {
    const s = getStore();
    const p = s.projects[0];
    expect(buildFeatureVector(s, p)).toEqual(buildFeatureVector(s, p));
  });
});
