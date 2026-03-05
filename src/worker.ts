/**
 * worker.ts — Standalone Worker Entrypoint
 *
 * Runs ONLY background workers (AudioMerge, MediaProcessing).
 * Does NOT start Express, Socket.io, or serve HTTP traffic.
 *
 * Usage:
 *   npm run start:worker
 *   node dist/src/worker.js
 *
 * Docker:
 *   CMD ["node", "dist/src/worker.js"]
 */
import os from "os";
import http from "http";
import { connectToPrisma } from "./utils/prisma";
import logger from "./utils/logger";
import { workerMetrics } from "./utils/worker-metrics";
import { rabbitMQService } from "./utils/rabbitmq";
import { AudioMergeWorker } from "./listeners/audio-merge.listener";
import { MediaProcessingWorker } from "./listeners/media-processing.listener";

const WORKER_PORT = Number(process.env.WORKER_HEALTH_PORT || 8080);
const cpuCount = os.cpus().length;

// ---------------------------------------------------------------------------
// Health Server (tiny HTTP server for Docker healthchecks)
// ---------------------------------------------------------------------------
let isHealthy = false;

const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    if (isHealthy) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(workerMetrics.getSnapshot()));
    } else {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "starting" }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function main() {
  logger.info(
    `[Worker] Starting on ${os.hostname()} (${cpuCount} CPUs, ${Math.round(os.totalmem() / 1024 / 1024)}MB RAM)`,
  );

  // CPU safety: warn if running more workers than cores
  if (cpuCount <= 1) {
    logger.warn(
      `[Worker] Only ${cpuCount} CPU core(s) available. Ensure worker replicas <= ${Math.max(cpuCount - 1, 1)}`,
    );
  }

  // 1. Connect to Prisma (required for DB writes after merge)
  await connectToPrisma();

  // 2. Connect to RabbitMQ
  try {
    await rabbitMQService.connect();
    logger.info("[Worker] RabbitMQ connected");
  } catch (error) {
    logger.error("[Worker] Failed to connect to RabbitMQ:", error);
    process.exit(1);
  }

  // 3. Start Audio Merge Worker
  try {
    const audioWorker = new AudioMergeWorker();
    await audioWorker.start();
    logger.info("[Worker] AudioMergeWorker started");
  } catch (error) {
    logger.error("[Worker] Failed to start AudioMergeWorker:", error);
    process.exit(1);
  }

  // 4. Start Media Processing Worker
  try {
    const mediaWorker = new MediaProcessingWorker();
    await mediaWorker.start();
    logger.info("[Worker] MediaProcessingWorker started");
  } catch (error) {
    logger.error("[Worker] Failed to start MediaProcessingWorker:", error);
    // Non-critical — don't exit
  }

  // 5. Mark healthy and start health server
  isHealthy = true;
  healthServer.listen(WORKER_PORT, () => {
    logger.info(`[Worker] Health endpoint listening on :${WORKER_PORT}/health`);
  });

  // 6. Start periodic metrics logging
  workerMetrics.startPeriodicLogging();

  logger.info("[Worker] All workers initialized successfully ✓");
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  logger.info(`[Worker] Received ${signal}. Shutting down gracefully...`);
  isHealthy = false;
  healthServer.close(() => {
    logger.info("[Worker] Health server closed");
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  logger.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
