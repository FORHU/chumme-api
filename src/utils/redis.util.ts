import { createClient, RedisClientType } from "redis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../config";

export default class RedisUtil {
  static redisClient: RedisClientType;
  static async initialize() {
    this.redisClient = await createClient({
      password: REDIS_PASSWORD,
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    });

    this.redisClient.on("ready", () => {
      console.log(
        `[RedisUtil] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`,
      );
    });

    this.redisClient.on("error", (err) => {
      console.error("[RedisUtil] Redis connection error:", err);
    });

    await this.redisClient.connect();
  }

  static useConnection(): RedisClientType | undefined {
    return this.redisClient;
  }

  /**
   * Get duplicate clients for Socket.IO Redis Adapter
   */
  static getAdapterClients() {
    const pubClient = createClient({
      password: REDIS_PASSWORD,
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    });
    const subClient = pubClient.duplicate();
    return { pubClient, subClient };
  }

  /**
   * Check if a job is already processed or currently in progress
   */
  static async isDuplicate(
    type: string,
    id: string,
    ttl: number = 3600,
  ): Promise<boolean> {
    const key = `job:dedup:${type}:${id}`;
    const result = await this.redisClient.set(key, "1", {
      NX: true,
      EX: ttl,
    });
    return result === null;
  }

  /**
   * Simple fixed-window rate limiter
   */
  static async isRateLimited(
    platform: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `ratelimit:${platform}`;
    const count = await this.redisClient.incr(key);

    if (count === 1) {
      await this.redisClient.expire(key, windowSeconds);
    }

    return count > limit;
  }
}
