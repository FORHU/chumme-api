import express from "express";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
    },
  };

  const statusCode = 200;

  res.status(statusCode).json(health);
});

// RabbitMQ specific health check (disabled since listeners were removed)
router.get("/health/rabbitmq", (req, res) => {
  res.status(200).json({
    service: "rabbitmq",
    status: "disabled",
    timestamp: new Date().toISOString(),
  });
});

export default router;
