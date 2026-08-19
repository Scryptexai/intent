import { describe, expect, it } from "vitest";
import { scanAnomalies, acknowledgeAlert, anomalyList, getAnomalyDetail } from "@/services/anomaly-detection";
import { getStore } from "@/lib/store";

describe("anomaly-detection (The Sentinel)", () => {
  it("scans 500 projects and records a scan log", () => {
    const res = scanAnomalies(undefined, "manual");
    expect(res.scannedProjects).toBe(500);
    expect(res.scannedMetrics).toBe(1500);
    expect(res.threshold).toBe(2);
    const logs = getStore().anomalyLogs;
    expect(logs[0].scannedProjects).toBe(500);
  });

  it("detects the injected hero anomalies beyond 2σ", () => {
    scanAnomalies();
    const s = getStore();
    const byProject = (slug: string, metric: string) => {
      const p = s.projects.find((x) => x.slug === slug)!;
      return s.alerts.some((a) => a.projectId === p.id && a.metric === metric && a.anomalyScore > 2);
    };
    expect(byProject("hyperliquid", "volume")).toBe(true);
    expect(byProject("ethena", "tvl")).toBe(true);
    expect(byProject("blur", "sentiment")).toBe(true);
  });

  it("single-project scan only touches that project", () => {
    const before = getStore().alerts.length;
    scanAnomalies("p-pendle");
    const after = getStore().alerts.length;
    expect(after - before).toBeLessThanOrEqual(3);
  });

  it("acknowledges (resolves) an alert and lists the rest", () => {
    scanAnomalies();
    const list = anomalyList(true);
    expect(list.length).toBeGreaterThan(0);
    const target = list[0];
    const acked = acknowledgeAlert(target.id);
    expect(acked?.resolved).toBe(true);
    expect(anomalyList(true).some((a) => a.id === target.id)).toBe(false);
  });

  it("builds a side-panel detail with deviation + analog + knowledge", () => {
    scanAnomalies();
    const alert = anomalyList(true)[0];
    const detail = getAnomalyDetail(alert.id);
    expect(detail.series.length).toBe(90);
    expect(Math.abs(detail.deviation.z)).toBeGreaterThan(2);
    expect(detail.relatedKnowledge.length).toBeGreaterThan(0);
  });
});
