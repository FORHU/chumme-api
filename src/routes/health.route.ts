import express from "express";
import { videoPostListener } from "../listeners/video-post.listener";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
    const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
            api: "healthy",
            rabbitmq: videoPostListener.isConnectionActive()
                ? "healthy"
                : "unhealthy",
        },
    };

    const statusCode = health.services.rabbitmq === "healthy" ? 200 : 503;

    res.status(statusCode).json(health);
});

// RabbitMQ specific health check
router.get("/health/rabbitmq", (req, res) => {
    const isHealthy = videoPostListener.isConnectionActive();

    res.status(isHealthy ? 200 : 503).json({
        service: "rabbitmq",
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
    });
});

export default router;
