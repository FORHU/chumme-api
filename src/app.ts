// src/app.ts
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectToPrisma } from "./utils/prisma";
import router from "./routes";
import { isDev } from "./config";
import setup from "./setup";
import { errorHandler } from "./middleware/error-handler.middleware";

import events from "./events";
import { videoPostListener, instagramPostListener } from "./listeners";

const app = express();

// ----------------------
// Express middleware
// ----------------------
app.set("trust proxy", 1); // if behind proxy (for rate limiting)

// Enable CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Rate limiting (only in production)
if (!isDev) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // max requests per IP
  });
  app.use(limiter);
}

// Security headers
app.use(helmet());
app.disable("x-powered-by");

// ----------------------
// Routes
// ----------------------
app.use("/api", router);
app.use(errorHandler);

// ----------------------
// Create HTTP server & Socket.IO
// ----------------------
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ----------------------
// Socket.IO Events
// ----------------------
events(io);

// ----------------------
// Connect to DB & RabbitMQ
// ----------------------
connectToPrisma()
  .then(async () => {
    // Run initial setup
    setup();

    // Initialize RabbitMQ listeners
    try {
      await instagramPostListener.connect();
      await instagramPostListener.startListening();

      await videoPostListener.connect();
      await videoPostListener.startListening();

      console.log("RabbitMQ listeners initialized successfully");
    } catch (error) {
      console.error("Failed to initialize RabbitMQ listeners:", error);
      // Don't crash the server if RabbitMQ fails
    }
  })
  .catch((err: any) => {
    console.error("Failed to connect to Prisma:", err);
  });

export default server;
