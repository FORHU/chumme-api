import { REDIS_TTL_SECONDS } from "../config";
import logger from "./logger";
import RedisUtil from "./redis.util";

export default class CacheUtil {

    static async get<T = any>(key: string): Promise<T | null> {
        try {
            const redis = RedisUtil.useConnection()
            const data = await redis.get(key)

            if(!data){
                logger.info(`[CacheUtil:get] MISS → ${key}`)
                return null;
            }

            logger.info(`[CacheUtil:get] HIT → ${key}`)
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error(`[CacheUtil:get] Failed to get key ${key}:`, error)
            return null;
        }
    }

    static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            const redis = RedisUtil.useConnection();
            const serialized = JSON.stringify(value);
            if(!ttlSeconds){
              ttlSeconds =   REDIS_TTL_SECONDS
            }
            if(ttlSeconds && ttlSeconds > 0){
                await redis.setEx(key, ttlSeconds, serialized)
                logger.info(`[CacheUtil:set] SETEX → ${key} (${ttlSeconds})s`)
            } else {
                await redis.set(key, serialized)
                logger.info(`[CacheUtil:set] SET → ${key}`)
            }
        } catch (error) {
            logger.error(`[CacheUtil:set] Failed to set key ${key}:`, error)
        }
    }

    static async del(key: string): Promise<void> {
        try {
            const redis = RedisUtil.useConnection()
            await redis.del(key)
            logger.info(`[CacheUtil:del] DEL → ${key}`)
        } catch (error) {
            logger.info(`[CacheUtil:del] Failed to delete key ${key}:`, error)
        }

    }

    static async delByPattern(pattern: string): Promise<void> {
    try {
        const redis = RedisUtil.useConnection();
        const keys = await redis.keys(pattern);
        if (keys.length) {
            await redis.del(keys);
            logger.info(`[CacheUtil:delByPattern] Deleted keys → ${keys}`);
        }
    } catch (error) {
        logger.error(`[CacheUtil:delByPattern] Failed to delete pattern ${pattern}:`, error);
    }
}

}