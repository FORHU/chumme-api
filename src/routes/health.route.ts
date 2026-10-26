import express from "express";
import { JOB_QUEUE_URLS } from "../config";
import { getQueueHealth } from "../utils/sqs";
import { prisma } from "../utils/prisma";
import RedisUtil from "../utils/redis.util";
import { QuotaService } from "../services/net-communities/ingestion/quota.service";

const router = express.Router();

/**
 * Enhanced health check endpoint with dependency status
 * Checks: API, Redis, SQS job queues, Database (ingestion targets)
 */
router.get("/health", async (req, res) => {
  // 1. Check SQS: every job queue must answer GetQueueAttributes
  const queues = await getQueueHealth(JOB_QUEUE_URLS);
  const sqsStatus = Object.values(queues).every((q) => !("error" in q))
    ? "connected"
    : "disconnected";

  // 2. Check Redis
  let redisStatus = "disconnected";
  try {
    const pong = await RedisUtil.redisClient.ping();
    redisStatus = pong === "PONG" ? "connected" : "degraded";
  } catch {
    redisStatus = "disconnected";
  }

  // 3. Check DB + fetch ingestion stats
  let dbStatus = "disconnected";
  let activeTargets = 0;
  let chummeTargets = 0;
  try {
    [activeTargets, chummeTargets] = await Promise.all([
      prisma.socialIngestionTarget.count({ where: { isActive: true } }),
      prisma.socialIngestionTarget.count({
        where: { isActive: true, NOT: { chummeCategoryId: null } },
      }),
    ]);
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  // 4. Check Quota Usage
  let quotaUsage = 0;
  let quotaStatus = "ok";
  try {
    quotaUsage = await QuotaService.getUsage();
    // Standard YouTube quota is 10,000 units
    if (quotaUsage > 9000) quotaStatus = "critical";
    else if (quotaUsage > 7000) quotaStatus = "warning";
  } catch {
    quotaStatus = "unknown";
  }

  // 4. Derive overall status
  const allHealthy =
    sqsStatus === "connected" &&
    redisStatus === "connected" &&
    dbStatus === "connected";
  const anyDown = [sqsStatus, redisStatus, dbStatus].some(
    (s) => s === "disconnected",
  );
  const overallStatus = allHealthy ? "ok" : anyDown ? "degraded" : "ok";

  const health = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      sqs: sqsStatus,
      redis: redisStatus,
      database: dbStatus,
    },
    ingestion: {
      totalActiveTargets: activeTargets,
      chummeCategoryTargets: chummeTargets,
      dailyQuotaUsage: quotaUsage,
      quotaStatus: quotaStatus,
      quotaLimit: 10000,
    },
  };

  return res.status(overallStatus === "ok" ? 200 : 503).json(health);
});

// SQS job queues: depth of each, or the error reaching it
router.get("/health/queues", async (req, res) => {
  const queues = await getQueueHealth(JOB_QUEUE_URLS);
  const ok = Object.values(queues).every((q) => !("error" in q));
  res.status(ok ? 200 : 503).json({
    service: "sqs",
    status: ok ? "connected" : "disconnected",
    queues,
    timestamp: new Date().toISOString(),
  });
});

export default router;
