import { describe, expect, it } from "vitest";
import { getCifDataset, cifStats, cifDossier, cifKeyFor, mergeCifIntoStore } from "@/services/cif-loader";
import { getStore } from "@/lib/store";
import { POVS } from "@/lib/cif/types";

describe("cif-loader (locked cif-export/1 schema)", () => {
  it("loads the locked dataset with expected scale", async () => {
    const d = await getCifDataset();
    const s = cifStats(d);
    expect(s.schema).toBe("cif-export/1");
    expect(s.projects).toBe(27);
    expect(s.patterns).toBe(16);
    expect(s.entities).toBeGreaterThan(900);
    expect(s.decisionEvents).toBeGreaterThan(100);
    expect(s.benchmarks).toBe(3);
  });

  it("decision events conform to the locked causal shape (hidden factors + 8-POV reactions)", async () => {
    const d = await getCifDataset();
    const de = d.decisionEvents["LayerZero"][0];
    for (const k of ["project", "date", "title", "trigger", "decision", "alternatives", "motivation", "constraint", "pressure", "tradeoff", "immediate_result", "long_term_impact"]) {
      expect(de).toHaveProperty(k);
    }
    expect(Object.keys(de.reactions).every((p) => (POVS as readonly string[]).includes(p))).toBe(true);
  });

  it("resolves dossier by slug or name, case-insensitive", async () => {
    const d = await getCifDataset();
    expect(cifKeyFor(d, "layerzero")).toBe("LayerZero");
    expect(cifKeyFor(d, "Arbitrum")).toBe("Arbitrum");
    const dos = cifDossier(d, "arbitrum");
    expect(dos?.qa?.total).toBeGreaterThan(0);
    expect(dos?.qa?.dimensions).toHaveLength(6);
    expect(cifDossier(d, "not-a-project")).toBeNull();
  });

  it("pattern registry carries scope + confidence derivation", async () => {
    const d = await getCifDataset();
    for (const p of d.patterns) {
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(p.confidence);
      expect(p.scope.length).toBeGreaterThan(0);
      if (p.instances === 1) expect(p.confidence).toBe("LOW");
    }
  });

  it("merges catalog into store idempotently and links existing slugs", async () => {
    const s = getStore();
    const before = s.projects.length;
    await mergeCifIntoStore(s);
    const afterFirst = s.projects.length;
    expect(afterFirst).toBeGreaterThanOrEqual(before);
    expect(s.cif).not.toBeNull();
    // idempotent second merge
    await mergeCifIntoStore(s);
    expect(s.projects.length).toBe(afterFirst);
    // linked known slug (arbitrum exists in synthetic set)
    expect(s.cifLinks.get("arbitrum")).toBe("Arbitrum");
  });
});
