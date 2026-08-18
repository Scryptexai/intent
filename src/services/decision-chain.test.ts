import { describe, expect, it } from "vitest";
import { addBranch, getDecisionChain } from "@/services/decision-chain";

describe("decision-chain hardening", () => {
  it("rejects too-short / too-long titles and clamps probability", () => {
    expect(() => addBranch({ projectId: "p-blur", parentId: "e-blur-1", title: "x" })).toThrow();
    expect(() => addBranch({ projectId: "p-blur", parentId: "e-blur-1", title: "a".repeat(201) })).toThrow();
    const node = addBranch({ projectId: "p-blur", parentId: "e-blur-1", title: "Counter-factual audit branch", probability: 7 });
    expect(node.probability).toBe(0.99);
    const low = addBranch({ projectId: "p-blur", parentId: "e-blur-1", title: "Counter-factual low", probability: -3 });
    expect(low.probability).toBe(0.01);
  });

  it("rejects unknown project / parent", () => {
    expect(() => addBranch({ projectId: "p-nope", parentId: null, title: "Valid title here" })).toThrow();
    expect(() => addBranch({ projectId: "p-blur", parentId: "ev-nope", title: "Valid title here" })).toThrow();
  });

  it("builds a chain with nodes+edges for known projects", () => {
    const chain = getDecisionChain("p-blur");
    expect(chain.nodes.length).toBeGreaterThan(3);
    expect(chain.edges.length).toBeGreaterThan(2);
    expect(() => getDecisionChain("p-nope")).toThrow();
  });
});
