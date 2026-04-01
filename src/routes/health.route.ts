import express from "express";
import { rabbitMQService } from "../utils/rabbitmq";
import { prisma } from "../utils/prisma";

const router = express.Router();

/**
 * Enhanced health check endpoint with dependency status
 */
router.get("/health", async (req, res) => {
  try {
    // 1. Check RabbitMQ
    const rabbitConnected = rabbitMQService.isConnectionActive();

    // 2. Fetch Ingestion Stats
    const activeTargets = await prisma.socialIngestionTarget.count({
      where: { isActive: true },
    });

    const chummeTargets = await prisma.socialIngestionTarget.count({
      where: { isActive: true, NOT: { chummeCategoryId: null } },
    });

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        api: "healthy",
        rabbitmq: rabbitConnected ? "connected" : "disconnected",
      },
      ingestion: {
        totalActiveTargets: activeTargets,
        chummeCategoryTargets: chummeTargets,
      },
    };

    return res.status(200).json(health);
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: error.message || "Internal server error",
    });
  }
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
