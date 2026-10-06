// src/app.ts
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { connectToPrisma } from "./utils/prisma";
import router from "./routes";
import { isDev } from "./config";
import setup from "./setup";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import RedisUtil from "./utils/redis.util";
import { errorHandler } from "./middleware/error-handler.middleware";

import { SchedulingService } from "./services/net-communities/ingestion/scheduling.service";
import { AudioMergeWorker } from "./listeners/audio-merge.listener";
import { IngestionWorker } from "./listeners/ingestion.listener";

// BigInt serialization fix for JSON responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

// Set up rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
});

if (!isDev) app.use(limiter);

// Set up security headers
app.use(helmet());
app.disable("x-powered-by");

// Use router for routing
app.use("/api", router);
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[ErrorHandler]", err);
  errorHandler(err, req, res, next);
});

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow any origin for development, or specify your frontend URL
      // Since express-cors is already configured with origin: true, we mirror that logic
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

(global as any).io = io;

import events from "./events";

events(io);

// Connect to PostgreSQL via Prisma and RabbitMQ
connectToPrisma()
  .then(async () => {
    // Run setup
    await setup();

    // Initialize Redis Adapter for horizontal scaling
    const { pubClient, subClient } = RedisUtil.getAdapterClients();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket] Redis adapter initialized");

    // Connect shared RabbitMQ service (for publishing jobs)
    try {
      const { rabbitMQService } = await import("./utils/rabbitmq");
      await rabbitMQService.connect();
      console.log("Shared RabbitMQ service connected");
    } catch (error) {
      console.error("Failed to connect shared RabbitMQ service:", error);
    }

    // Initialize Workers (conditional)
    const startWorkers = process.env.START_WORKERS !== "false";

    if (startWorkers) {
      // Audio Merge Worker (background FFmpeg processing)
      try {
        const audioMergeWorker = new AudioMergeWorker();
        await audioMergeWorker.start();
        console.log("Audio Merge RabbitMQ worker initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Audio Merge worker:", error);
      }

      // Ingestion Worker & Scheduler
      try {
        const ingestionWorker = new IngestionWorker();
        await ingestionWorker.start();

        await SchedulingService.start();
        console.log("Ingestion Pipeline & Scheduler initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Ingestion Pipeline:", error);
      }

      // Media Processing Worker (Video/HLS) - DISABLED (Stale)
      try {
        const { MediaProcessingWorker } =
          await import("./listeners/media-processing.listener");
        const mediaWorker = new MediaProcessingWorker();
        await mediaWorker.start();
        console.log(
          "Media Processing RabbitMQ worker initialized successfully",
        );
      } catch (error) {
        console.error("Failed to initialize Media Processing worker:", error);
      }
    } else {
      console.log("Workers disabled by START_WORKERS=false");
    }
  })
  .catch((err: any) => {
    console.log(err);
  });

export default server;
