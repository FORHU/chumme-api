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

async function main() {
  logger.info(
    `[Worker] Starting on ${os.hostname()} (${cpuCount} CPUs, ${Math.round(os.totalmem() / 1024 / 1024)}MB RAM)`,
  );

  if (cpuCount <= 1) {
    logger.warn(`[Worker] Only ${cpuCount} CPU core(s) available.`);
  }

  await connectToPrisma();

  try {
    await rabbitMQService.connect();
    logger.info("[Worker] RabbitMQ connected");
  } catch (error) {
    logger.error("[Worker] Failed to connect to RabbitMQ:", error);
    process.exit(1);
  }

  try {
    const audioWorker = new AudioMergeWorker();
    await audioWorker.start();
    logger.info("[Worker] AudioMergeWorker started");
  } catch (error) {
    logger.error("[Worker] Failed to start AudioMergeWorker:", error);
    process.exit(1);
  }

  try {
    const mediaWorker = new MediaProcessingWorker();
    await mediaWorker.start();
    logger.info("[Worker] MediaProcessingWorker started");
  } catch (error) {
    logger.error("[Worker] Failed to start MediaProcessingWorker:", error);
  }

  try {
    const { IngestionWorker } = await import("./listeners/ingestion.listener");
    const ingestionWorker = new IngestionWorker();
    await ingestionWorker.start();
    logger.info("[Worker] IngestionWorker started");
  } catch (error) {
    logger.error("[Worker] Failed to start IngestionWorker:", error);
  }

  try {
    const { SchedulingService } =
      await import("./services/net-communities/ingestion/scheduling.service");
    await SchedulingService.start();
    logger.info("[Worker] SchedulingService started");
  } catch (error) {
    logger.error("[Worker] Failed to start SchedulingService:", error);
  }

  // Sports fixtures and live scores. Non-fatal like the workers above: an ESPN
  // outage or an empty SportLeague table must not stop the rest of the worker.
  try {
    const { default: SportPollingService } =
      await import("./services/sport-polling.service");
    await SportPollingService.start();
    logger.info("[Worker] SportPollingService started");
  } catch (error) {
    logger.error("[Worker] Failed to start SportPollingService:", error);
  }

  isHealthy = true;
  healthServer.listen(WORKER_PORT, () => {
    logger.info(`[Worker] Health endpoint listening on :${WORKER_PORT}/health`);
  });

  workerMetrics.startPeriodicLogging();
  logger.info("[Worker] All workers initialized successfully ✓");
}

function shutdown(signal: string) {
  logger.info(`[Worker] Received ${signal}. Shutting down gracefully...`);
  isHealthy = false;
  healthServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  logger.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
