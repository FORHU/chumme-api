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

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "*",
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
app.use(errorHandler);

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

(global as any).io = io;

import events from "./events";
import { videoPostListener, instagramPostListener } from "./listeners";

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

    // Initialize RabbitMQ crawler listeners
    try {
      await instagramPostListener.connect();
      await instagramPostListener.startListening();
      await videoPostListener.connect();
      await videoPostListener.startListening();

      console.log("Video Post RabbitMQ listener initialized successfully");
    } catch (error) {
      console.error(
        "Failed to initialize Video Post RabbitMQ listener:",
        error,
      );
      // Don't crash the server if RabbitMQ fails
    }

    // Initialize Audio Merge Worker (background FFmpeg processing)
    try {
      const { AudioMergeWorker } = await import(
        "./listeners/audio-merge.listener"
      );
      const audioMergeWorker = new AudioMergeWorker();
      await audioMergeWorker.start();
      console.log("Audio Merge RabbitMQ worker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Audio Merge worker:", error);
      // Don't crash the server if worker fails
    }
  })
  .catch((err: any) => {
    console.log(err);
  });

export default server;
