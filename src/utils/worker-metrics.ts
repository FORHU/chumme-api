/**
 * Worker Metrics — Lightweight monitoring for production workers.
 *
 * Tracks job counts, durations, failures, and system resource usage.
 * Logs a summary every METRICS_INTERVAL_MS (default: 60s).
 */
import os from "os";
import logger from "./logger";

const METRICS_INTERVAL_MS = Number(process.env.METRICS_INTERVAL_MS || 60_000);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface JobMetric {
  jobId: string;
  jobType: string;
  durationMs: number;
  status: "success" | "failed" | "timeout";
  timestamp: number;
}

export class WorkerMetrics {
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private jobsTimedOut = 0;
  private totalDurationMs = 0;
  private recentJobs: JobMetric[] = [];
  private startedAt = Date.now();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * Record a completed (success or failed) job.
   */
  recordJob(metric: Omit<JobMetric, "timestamp">) {
    const entry: JobMetric = { ...metric, timestamp: Date.now() };
    this.recentJobs.push(entry);
    if (metric.status === "success") {
      this.jobsProcessed++;
      this.totalDurationMs += metric.durationMs;
    } else if (metric.status === "timeout") {
      this.jobsTimedOut++;
      this.jobsFailed++;
    } else {
      this.jobsFailed++;
    }
    // Keep only last 100 entries in memory
    if (this.recentJobs.length > 100) {
      this.recentJobs = this.recentJobs.slice(-100);
    }
  }

  /**
   * Get current system and worker metrics snapshot.
   */
  getSnapshot() {
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    return {
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      jobs: {
        processed: this.jobsProcessed,
        failed: this.jobsFailed,
        timedOut: this.jobsTimedOut,
        avgDurationMs:
          this.jobsProcessed > 0
            ? Math.round(this.totalDurationMs / this.jobsProcessed)
            : 0,
      },
      system: {
        cpus: os.cpus().length,
        loadAvg1m: loadAvg[0].toFixed(2),
        memoryRss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        memoryHeap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        freeMem: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
        totalMem: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      },
    };
  }

  /**
   * Start periodic metrics logging.
   */
  startPeriodicLogging() {
    this.intervalHandle = setInterval(() => {
      const snapshot = this.getSnapshot();
      logger.info("[WorkerMetrics] Periodic report", snapshot);
    }, METRICS_INTERVAL_MS);

    // Don't prevent process exit
    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }

  /**
   * Stop periodic logging.
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export const workerMetrics = new WorkerMetrics();
