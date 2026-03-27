import { REDIS_TTL_SECONDS } from "../config";
import logger from "./logger";
import RedisUtil from "./redis.util";

export default class CacheUtil {
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const redis = RedisUtil.useConnection();
      if (!redis) {
        logger.warn(
          `[CacheUtil:get] Redis connection not available for key: ${key}`,
        );
        return null;
      }
      const data = await redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`[CacheUtil:get] Failed to get key ${key}:`, error);
      return null;
    }
  }

  static async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const redis = RedisUtil.useConnection();
      if (!redis) {
        logger.warn(
          `[CacheUtil:set] Redis connection not available for key: ${key}`,
        );
        return;
      }
      const serialized = JSON.stringify(value);
      if (!ttlSeconds) {
        ttlSeconds = REDIS_TTL_SECONDS;
      }
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.setEx(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`[CacheUtil:set] Failed to set key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      const redis = RedisUtil.useConnection();
      if (!redis) {
        logger.warn(
          `[CacheUtil:del] Redis connection not available for key: ${key}`,
        );
        return;
      }
      await redis.del(key);
    } catch (error) {
      logger.error(`[CacheUtil:del] Failed to delete key ${key}:`, error);
    }
  }

  static async delByPattern(pattern: string): Promise<void> {
    try {
      const redis = RedisUtil.useConnection();
      if (!redis) {
        logger.warn(
          `[CacheUtil:delByPattern] Redis connection not available for pattern: ${pattern}`,
        );
        return;
      }
      const keys = await redis.keys(pattern);
      if (keys.length) {
        await redis.del(keys);
      }
    } catch (error) {
      logger.error(
        `[CacheUtil:delByPattern] Failed to delete pattern ${pattern}:`,
        error,
      );
    }
  }

  static async flushAll(): Promise<void> {
    try {
      const redis = RedisUtil.useConnection();
      if (!redis) {
        logger.warn("[CacheUtil:flushAll] Redis connection not available");
        return;
      }
      await redis.flushAll();
      logger.info("[CacheUtil] Redis cache flushed successfully");
    } catch (error) {
      logger.error("[CacheUtil:flushAll] Failed to flush cache:", error);
      throw error;
    }
  }
}
