import os from "os";
import logger from "./logger";

const METRICS_INTERVAL_MS = Number(process.env.METRICS_INTERVAL_MS || 60_000);

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
    if (this.recentJobs.length > 100)
      this.recentJobs = this.recentJobs.slice(-100);
  }

  getSnapshot() {
    const memUsage = process.memoryUsage();
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
        loadAvg1m: os.loadavg()[0].toFixed(2),
        memoryRss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        memoryHeap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        freeMem: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
        totalMem: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      },
    };
  }

  startPeriodicLogging() {
    this.intervalHandle = setInterval(async () => {
      const snapshot = this.getSnapshot();
      logger.info("[WorkerMetrics] Periodic report", snapshot);

      // Persist to Redis for main API consumption
      try {
        const RedisUtil = (await import("./redis.util")).default;
        if (RedisUtil.redisClient) {
          await RedisUtil.redisClient.set(
            "worker:metrics:snapshot",
            JSON.stringify(snapshot),
            {
              EX: 300, // 5 mins TTL
            },
          );
        }
      } catch (err) {
        logger.error("[WorkerMetrics] Failed to save snapshot to Redis:", err);
      }
    }, METRICS_INTERVAL_MS);
    if (this.intervalHandle.unref) this.intervalHandle.unref();
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export const workerMetrics = new WorkerMetrics();
