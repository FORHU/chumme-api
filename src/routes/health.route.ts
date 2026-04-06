import express from "express";
import { rabbitMQService } from "../utils/rabbitmq";
import { prisma } from "../utils/prisma";
import RedisUtil from "../utils/redis.util";

const router = express.Router();

/**
 * Enhanced health check endpoint with dependency status
 * Checks: API, Redis, RabbitMQ, Database (ingestion targets)
 */
router.get("/health", async (req, res) => {
  // 1. Check RabbitMQ
  const rabbitConnected = rabbitMQService.isConnectionActive();
  const rabbitmqStatus = rabbitConnected ? "connected" : "disconnected";

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

  // 4. Derive overall status
  const allHealthy =
    rabbitmqStatus === "connected" &&
    redisStatus === "connected" &&
    dbStatus === "connected";
  const anyDown = [rabbitmqStatus, redisStatus, dbStatus].some(
    (s) => s === "disconnected",
  );
  const overallStatus = allHealthy ? "ok" : anyDown ? "degraded" : "ok";

  const health = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      rabbitmq: rabbitmqStatus,
      redis: redisStatus,
      database: dbStatus,
    },
    ingestion: {
      totalActiveTargets: activeTargets,
      chummeCategoryTargets: chummeTargets,
    },
  };

  return res.status(overallStatus === "ok" ? 200 : 503).json(health);
});

// RabbitMQ specific health check
router.get("/health/rabbitmq", (req, res) => {
  const isConnected = rabbitMQService.isConnectionActive();
  res.status(isConnected ? 200 : 503).json({
    service: "rabbitmq",
    status: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
