import { getStore, insertAlert, resolveAlert, listAlerts } from "@/lib/store";
import { pushNotification } from "@/lib/repo";
import type { AlertRow, MetricPoint } from "@/lib/domain";
import { findAnalogProject } from "@/services/similarity-engine";
import { logger, ServiceError } from "@/services/logger";
import { randomUUID } from "crypto";

/**
 * ── THE SENTINEL · Anomaly Detection service ───────────────────────────────
 * scanAnomalies(): for each project (or one) and each metric (TVL, Volume,
 * Sentiment) — trailing 30-day moving average + σ; deviations beyond 2σ with
 * a real effect size are inserted into `alerts` (the anomalies table). Every
 * run is recorded in `anomaly_logs`.
 */

export interface ScanSummary {
  scannedProjects: number;
  scannedMetrics: number;
  newAlerts: number;
  threshold: number;
  finishedAt: string;
  logId: string;
}

const WINDOW = 30;
const Z_THRESHOLD = 2;
const MIN_EFFECT: Record<string, number> = { tvl: 0.05, volume: 0.08, sentiment: 0.06 };

function stats(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export function fmtMetric(v: number, metric: string): string {
  if (metric === "sentiment") return v.toFixed(2);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function scanAnomalies(projectId?: string, mode: "bullmq" | "interval" | "manual" = "manual"): ScanSummary {
  const s = getStore();
  const startedAt = new Date().toISOString();
  const logId = randomUUID();
  let scannedMetrics = 0;
  let newAlerts = 0;

  try {
    const targets = projectId ? s.projects.filter((p) => p.id === projectId || p.slug === projectId) : s.projects;

    for (const p of targets) {
      const ser = p.series;
      if (ser.length < WINDOW + 1) continue;
      const metrics: { key: "tvl" | "volume" | "sentiment"; get: (i: number) => number }[] = [
        { key: "tvl", get: (i) => ser[i].tvl },
        { key: "volume", get: (i) => ser[i].volume },
        { key: "sentiment", get: (i) => ser[i].sentiment },
      ];

      for (const m of metrics) {
        scannedMetrics++;
        const lastIdx = ser.length - 1;
        const window: number[] = [];
        for (let i = lastIdx - WINDOW; i < lastIdx; i++) window.push(m.get(i));
        const { mean, std } = stats(window);
        if (std === 0) continue;
        const last = m.get(lastIdx);
        const z = (last - mean) / std;
        const effect = m.key === "sentiment" ? Math.abs(last - mean) : Math.abs(last - mean) / Math.max(1e-9, Math.abs(mean));

        if (Math.abs(z) > Z_THRESHOLD && effect >= MIN_EFFECT[m.key]) {
          const dup = s.alerts.some((a) => a.projectId === p.id && a.metric === m.key && !a.resolved && a.createdAt.slice(0, 10) === startedAt.slice(0, 10));
        if (!dup) {
          insertAlert({
            projectId: p.id,
            metric: m.key,
            anomalyScore: Math.round(Math.abs(z) * 100) / 100,
            direction: z > 0 ? "up" : "down",
            detail: `${p.name} ${m.key} deviated ${z > 0 ? "+" : ""}${z.toFixed(2)}σ from its ${WINDOW}-day moving average (μ=${fmtMetric(mean, m.key)}, last=${fmtMetric(last, m.key)}).`,
          });
          newAlerts++;
          // fan-out to watchers (P1 notification loop)
          for (const w of s.watchlists.filter((x) => x.projectId === p.id && x.alertTriggers.sentinel)) {
            pushNotification({
              userId: w.userId,
              kind: "sentinel",
              title: `${p.name} · ${m.key} ${z > 0 ? "surge" : "collapse"} ${Math.abs(z).toFixed(2)}σ`,
              body: `${p.name} ${m.key} deviated ${z > 0 ? "+" : ""}${z.toFixed(2)}σ from its ${WINDOW}-day moving average.`,
              link: "/",
            });
          }
        }
        }
      }
    }

    s.anomalyLogs.unshift({
      id: logId,
      mode,
      scannedProjects: targets.length,
      scannedMetrics,
      newAlerts,
      threshold: Z_THRESHOLD,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    logger.info("sentinel", "scan complete", { mode, projects: targets.length, newAlerts });
  } catch (e) {
    logger.error("sentinel", "scan failed", { error: String(e) });
    throw e;
  }

  return { scannedProjects: projectId ? 1 : s.projects.length, scannedMetrics, newAlerts, threshold: Z_THRESHOLD, finishedAt: startedAt, logId };
}

export function acknowledgeAlert(id: string): AlertRow | null {
  const a = resolveAlert(id);
  if (!a) throw new ServiceError("ALERT_NOT_FOUND", `No alert '${id}'`, 404);
  logger.info("sentinel", "alert acknowledged", { id });
  return a;
}

export function anomalyList(unresolvedOnly = false) {
  const s = getStore();
  const byId = new Map(s.projects.map((p) => [p.id, p]));
  const watched = new Set(s.watchlists.map((w) => w.projectId));
  return listAlerts({ unresolvedOnly }).map((a) => {
    const p = byId.get(a.projectId);
    return {
      ...a,
      projectName: p?.name ?? "Unknown",
      projectSlug: p?.slug ?? "",
      category: p?.category ?? "",
      watched: watched.has(a.projectId),
    };
  });
}

export interface AnomalyDetail {
  alert: AlertRow;
  project: { id: string; name: string; slug: string; category: string; description: string };
  series: MetricPoint[];
  deviation: { windowMean: number; windowStd: number; last: number; z: number };
  similarPatternAt: { name: string; slug: string; similarity: number } | null;
  relatedKnowledge: { statement: string; source: string; confidence: number }[];
}

/** Side-panel payload: deviasi chart data + analog + knowledge links. */
export function getAnomalyDetail(alertId: string): AnomalyDetail {
  const s = getStore();
  const alert = s.alerts.find((a) => a.id === alertId);
  if (!alert) throw new ServiceError("ALERT_NOT_FOUND", `No alert '${alertId}'`, 404);
  const project = s.projects.find((p) => p.id === alert.projectId);
  if (!project) throw new ServiceError("PROJECT_NOT_FOUND", "alert's project missing", 404);

  const ser = project.series;
  const get = (i: number) => (alert.metric === "tvl" ? ser[i].tvl : alert.metric === "volume" ? ser[i].volume : ser[i].sentiment);
  const lastIdx = ser.length - 1;
  const window: number[] = [];
  for (let i = lastIdx - WINDOW; i < lastIdx; i++) window.push(get(i));
  const { mean, std } = stats(window);

  let similarPatternAt: AnomalyDetail["similarPatternAt"] = null;
  try {
    const mirror = findAnalogProject(project.id, 1);
    const top = mirror.analogs[0];
    if (top) similarPatternAt = { name: top.project.name, slug: top.project.slug, similarity: top.similarity };
  } catch {
    similarPatternAt = null;
  }

  const relatedKnowledge = s.knowledge
    .filter((k) => k.projectId === project.id)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((k) => ({ statement: k.statement, source: k.source, confidence: k.confidence }));

  return {
    alert,
    project: { id: project.id, name: project.name, slug: project.slug, category: project.category, description: project.description },
    series: ser,
    deviation: { windowMean: mean, windowStd: std, last: get(lastIdx), z: std === 0 ? 0 : (get(lastIdx) - mean) / std },
    similarPatternAt,
    relatedKnowledge,
  };
}

export function scanLogs(limit = 10) {
  return getStore().anomalyLogs.slice(0, limit);
}
