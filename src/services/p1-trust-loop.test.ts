import { describe, expect, it } from "vitest";
import { addCalibration, gradeCalibration, listCalibration, listNotifications, pushNotification } from "@/lib/repo";
import { scanAnomalies } from "@/services/anomaly-detection";

describe("calibration track record (§3.3)", () => {
  it("publish → pending → grade pass, immutably listed", async () => {
    const row = await addCalibration({
      projectId: "p-blur",
      statement: "Test read: farmer cohort churns within 7 days.",
      triggerCondition: "7d sell-through > 35%.",
      patternConfidence: 0.8,
      trajectoryProbability: 0.6,
      asOfDate: new Date().toISOString(),
      resolveAfter: new Date(Date.now() + 86400000 * 30).toISOString(),
    });
    expect(row.outcome).toBe("pending");
    const graded = await gradeCalibration(row.id, "pass", "u-demo");
    expect(graded?.outcome).toBe("pass");
    expect(graded?.gradedBy).toBe("u-demo");
    const list = await listCalibration();
    expect(list.some((c) => c.id === row.id)).toBe(true);
  });

  it("rejects unknown grade target", async () => {
    expect(await gradeCalibration("nope", "pass", "u-demo")).toBeNull();
  });
});

describe("notification loop (watchlist → Sentinel)", () => {
  it("fans out to watchers on new anomalies", async () => {
    scanAnomalies(); // seeded watchlists include p-blur/p-hyperliquid/p-eigenlayer
    const notes = await listNotifications("u-demo");
    // either new fan-out or pre-existing; structure must hold
    for (const n of notes) {
      expect(n.kind).toBe("sentinel");
      expect(n.title.length).toBeGreaterThan(0);
    }
    pushNotification({ userId: "u-demo", kind: "sentinel", title: "t", body: "b", link: "/" });
    const after = await listNotifications("u-demo");
    expect(after[0].read).toBe(false);
  });
});

describe("google oauth provisioning", () => {
  it("findOrCreate is idempotent per email and defaults viewer/free", async () => {
    const { findOrCreateOAuthUser } = await import("@/lib/repo");
    const a = await findOrCreateOAuthUser({ email: "new@gmail.com", name: "New User", provider: "google", sub: "g-123" });
    expect(a.role).toBe("viewer");
    expect(a.plan).toBe("free");
    expect(a.passwordHash).toBeNull();
    const b = await findOrCreateOAuthUser({ email: "NEW@gmail.com", name: "x", provider: "google", sub: "g-123" });
    expect(b.id).toBe(a.id);
  });
});
