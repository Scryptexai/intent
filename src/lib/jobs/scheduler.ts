import { scanAnomalies } from "@/services/anomaly-detection";
import { refreshTruthMatrix } from "@/services/truth-matrix";
import { watchPendingPayments } from "@/services/billing/watcher";
import { logger } from "@/services/logger";

/**
 * Queue wiring for background jobs.
 *
 * Production: BullMQ worker on Upstash Redis — repeatable jobs
 * (sentinel 6h, truth-refresh 24h, payment-watcher 5m).
 * Demo mode (no REDIS_URL): in-process scheduler with the same cadence.
 */

const SENTINEL_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours
const TRUTH_EVERY_MS = 24 * 60 * 60 * 1000; // 24 hours
const WATCHER_EVERY_MS = 5 * 60 * 1000; // 5 minutes (payment auto-trigger)
const QUEUE_NAME = "cif-sentinel";
const JOB_NAME = "sentinel-scan";

const g = globalThis as unknown as {
  __cifScheduler?: { mode: "bullmq" | "interval"; startedAt: string; lastRun?: string; runs: number; lastTruthRefresh?: string };
};

function runSentinel(mode: "bullmq" | "interval") {
  try {
    const res = scanAnomalies(undefined, mode);
    if (g.__cifScheduler) {
      g.__cifScheduler.lastRun = res.finishedAt;
      g.__cifScheduler.runs += 1;
    }
  } catch (e) {
    logger.error("scheduler", "sentinel run failed", { error: String(e) });
  }
}

function runTruthRefresh() {
  try {
    refreshTruthMatrix();
    if (g.__cifScheduler) g.__cifScheduler.lastTruthRefresh = new Date().toISOString();
  } catch (e) {
    logger.error("scheduler", "truth refresh failed", { error: String(e) });
  }
}

async function runPaymentWatcher() {
  try {
    const r = await watchPendingPayments();
    if (r.confirmed > 0) logger.info("scheduler", "payment watcher confirmed", r as never);
  } catch (e) {
    logger.error("scheduler", "payment watcher failed", { error: String(e) });
  }
}

async function startBullMq(): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) return false;
  try {
    const { Queue, Worker } = await import("bullmq");
    const connection = { url };
    const queue = new Queue(QUEUE_NAME, { connection });
    await queue.upsertJobScheduler(JOB_NAME, { every: SENTINEL_EVERY_MS }, {
      name: JOB_NAME,
      data: { triggeredBy: "scheduler" },
      opts: { removeOnComplete: 20, removeOnFail: 20 },
    });
    new Worker(QUEUE_NAME, async (job) => (job.name === "truth-refresh" ? runTruthRefresh() : runSentinel("bullmq")), { connection });
    return true;
  } catch {
    return false;
  }
}

/** Idempotent: safe to call from every request; boots schedulers once. */
export async function ensureScheduler(): Promise<{ mode: "bullmq" | "interval"; startedAt: string; lastRun?: string; runs: number; lastTruthRefresh?: string }> {
  if (g.__cifScheduler) return g.__cifScheduler;

  let mode: "bullmq" | "interval" = "interval";
  if (await startBullMq()) mode = "bullmq";
  else {
    setTimeout(() => runSentinel("interval"), 1500);
    setInterval(() => runSentinel("interval"), SENTINEL_EVERY_MS);
    setInterval(runTruthRefresh, TRUTH_EVERY_MS);
    setInterval(runPaymentWatcher, WATCHER_EVERY_MS);
  }

  g.__cifScheduler = { mode, startedAt: new Date().toISOString(), runs: 0 };
  return g.__cifScheduler;
}

export function schedulerStatus() {
  return g.__cifScheduler ?? null;
}
