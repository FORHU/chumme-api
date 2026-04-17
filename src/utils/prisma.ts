import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "../config";
import logger from "./logger";

const isDevOrStaging =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_QUERY_LOG === "true";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: `${DATABASE_URL}${DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=20`,
      },
    },
    log: isDevOrStaging
      ? [
          { emit: "event", level: "query" },
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ]
      : [
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ],
  });

// Log slow queries (>200ms) and all warnings/errors
const SLOW_QUERY_THRESHOLD_MS = 200;

(prisma as any).$on?.("query", (e: any) => {
  const durationMs = e.duration;
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn("Slow query detected", {
      durationMs,
      query: e.query?.slice(0, 500),
      params: e.params?.slice(0, 200),
    });
  }
});

(prisma as any).$on?.("warn", (e: any) => {
  logger.warn("Prisma warning", { message: e.message });
});

(prisma as any).$on?.("error", (e: any) => {
  logger.error("Prisma error", { message: e.message });
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const connectToPrisma = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL via Prisma");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    throw error;
  }
};

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};
