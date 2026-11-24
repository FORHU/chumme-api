// src/app.ts
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { connectToPrisma } from "./utils/prisma";
import router from "./routes";
import {
  AUDIO_MERGE_MODE,
  AUDIO_MERGE_RESULTS_QUEUE_URL,
  CORS_ORIGINS,
  isDev,
} from "./config";
import setup from "./setup";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import RedisUtil from "./utils/redis.util";
import { errorHandler } from "./middleware/error-handler.middleware";
import { safeErrorResponse } from "./middleware/safe-error-response.middleware";

import { SchedulingService } from "./services/net-communities/ingestion/scheduling.service";
import { AudioMergeWorker } from "./listeners/audio-merge.listener";
import { AudioMergeResultWorker } from "./listeners/audio-result.listener";
import { IngestionWorker } from "./listeners/ingestion.listener";

// BigInt serialization fix for JSON responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

app.set("trust proxy", 1);

// Requests without an Origin (the mobile app, curl, server-to-server) always
// pass. Browser origins need to be in CORS_ORIGINS outside development.
// No `credentials`: auth is a bearer header, not a cookie.
const isAllowedOrigin = (origin: string | undefined) =>
  !origin || isDev || CORS_ORIGINS.includes(origin);

const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => callback(null, isAllowedOrigin(origin));

app.use(cors({ origin: corsOrigin }));

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

// Strip internal error details (Prisma, stack traces, keys) from responses
app.use(safeErrorResponse);

// Use router for routing
app.use("/api", router);
app.use((err: any, req: any, res: any, next: any) => {
  logger.error("[ErrorHandler]", err);
  errorHandler(err, req, res, next);
});

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

(global as any).io = io;

import events from "./events";
import logger from "./utils/logger";

events(io);

// Connect to PostgreSQL via Prisma
connectToPrisma()
  .then(async () => {
    // Run setup
    await setup();

    // Initialize Redis Adapter for horizontal scaling
    const { pubClient, subClient } = RedisUtil.getAdapterClients();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("[Socket] Redis adapter initialized");

    // Initialize Workers (conditional)
    const startWorkers = process.env.START_WORKERS !== "false";

    // Audio merge results from the Lambda or src/worker.ts. Not gated on
    // START_WORKERS: it does no FFmpeg work, and it must run where socket.io is.
    if (AUDIO_MERGE_RESULTS_QUEUE_URL) {
      try {
        await new AudioMergeResultWorker().start();
        logger.info("Audio Merge result worker initialized successfully");
      } catch (error) {
        logger.error("Failed to initialize Audio Merge result worker:", error);
      }
    } else if (AUDIO_MERGE_MODE === "lambda") {
      logger.error(
        "AUDIO_MERGE_MODE=lambda but AUDIO_MERGE_RESULTS_QUEUE_URL is unset: " +
          "renders will finish but nothing will save them",
      );
    }

    if (startWorkers) {
      // Audio Merge Worker (background FFmpeg processing). In lambda mode the
      // Lambda consumes the job queue instead; two consumers must never race.
      if (AUDIO_MERGE_MODE === "local") {
        try {
          const audioMergeWorker = new AudioMergeWorker();
          await audioMergeWorker.start();
          logger.info("Audio Merge worker initialized successfully");
        } catch (error) {
          logger.error("Failed to initialize Audio Merge worker:", error);
        }
      } else {
        logger.info("Audio Merge worker skipped: AUDIO_MERGE_MODE=lambda");
      }

      // Ingestion Worker & Scheduler
      try {
        const ingestionWorker = new IngestionWorker();
        await ingestionWorker.start();

        await SchedulingService.start();
        logger.info("Ingestion Pipeline & Scheduler initialized successfully");
      } catch (error) {
        logger.error("Failed to initialize Ingestion Pipeline:", error);
      }

      // Media Processing Worker (Video/HLS) - DISABLED (Stale)
      try {
        const { MediaProcessingWorker } =
          await import("./listeners/media-processing.listener");
        const mediaWorker = new MediaProcessingWorker();
        await mediaWorker.start();
        logger.info("Media Processing worker initialized successfully");
      } catch (error) {
        logger.error("Failed to initialize Media Processing worker:", error);
      }
    } else {
      logger.info("Workers disabled by START_WORKERS=false");
    }
  })
  .catch((err: any) => {
    logger.error(err);
  });

export default server;
