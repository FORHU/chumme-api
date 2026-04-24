import { prisma } from "../../../utils/prisma";
import RedisUtil from "../../../utils/redis.util";
import logger from "../../../utils/logger";

const TRENDING_CACHE_KEY = "ranking:trending:top";
const TRENDING_CACHE_TTL = 60 * 15; // 15 minutes

export default class RankingService {
  /**
   * Calculate growth scores for all active social feed items
   * Comparative window: 24 hours
   *
   * Performance: Uses batched queries instead of per-item lookups.
   * - 1 query to fetch all items
   * - 1 query to fetch all relevant snapshots
   * - 1 batched transaction for all updates
   */
  static async calculateGrowthScores() {
    try {
      logger.info("[RankingService] Starting growth score calculation...");

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 1. Fetch all scoreable feed items in one query
      const items = await prisma.socialFeedItem.findMany({
        where: {
          isDeleted: false,
          chummeCategoryId: { not: null },
        },
        select: {
          id: true,
          views: true,
          likes: true,
          bookmarks: true,
        },
      });

      if (items.length === 0) {
        logger.info("[RankingService] No items to score.");
        return 0;
      }

      const itemIds = items.map((i) => i.id);

      // 2. Batch-fetch the oldest snapshot per item from the last 24h
      //    Using raw query for efficient "DISTINCT ON" grouping
      const snapshots = await prisma.socialFeedSnapshot.findMany({
        where: {
          socialFeedId: { in: itemIds },
          snapshotAt: { gte: yesterday, lte: now },
        },
        orderBy: { snapshotAt: "asc" },
        select: {
          socialFeedId: true,
          views: true,
          likes: true,
          bookmarks: true,
        },
      });

      // Build a map: feedId → earliest snapshot (first occurrence wins due to asc order)
      const snapshotMap = new Map<
        string,
        { views: number; likes: number; bookmarks: number }
      >();
      for (const snap of snapshots) {
        if (!snapshotMap.has(snap.socialFeedId)) {
          snapshotMap.set(snap.socialFeedId, snap);
        }
      }

      // 3. Calculate scores in memory
      const updates: { id: string; score: number }[] = [];

      for (const item of items) {
        const snapshot = snapshotMap.get(item.id);
        let score = 0;

        if (snapshot) {
          // Momentum-based scoring: deltas from 24h ago
          const deltaViews = Math.max(0, item.views - snapshot.views);
          const deltaLikes = Math.max(0, item.likes - snapshot.likes);
          const deltaBookmarks = Math.max(
            0,
            item.bookmarks - snapshot.bookmarks,
          );

          /**
           * Scoring Algorithm (Momentum-based)
           */
          score = deltaViews * 1 + deltaLikes * 5 + deltaBookmarks * 20;
        } else {
          // New item without snapshot — use initial performance, weighted lower
          score = item.views * 0.1 + item.likes * 1 + item.bookmarks * 2;
        }

        updates.push({ id: item.id, score });
      }

      // 4. Batch update all scores in a single transaction
      const BATCH_SIZE = 500;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map((u) =>
            prisma.socialFeedItem.update({
              where: { id: u.id },
              data: { score: u.score },
            }),
          ),
        );
      }

      // 5. Cache top trending items in Redis for fast mobile API reads
      try {
        const topItems = updates.sort((a, b) => b.score - a.score).slice(0, 50);
        await RedisUtil.redisClient.set(
          TRENDING_CACHE_KEY,
          JSON.stringify(topItems),
          { EX: TRENDING_CACHE_TTL },
        );
      } catch (cacheError) {
        logger.warn(
          "[RankingService] Failed to cache trending in Redis (non-fatal):",
          cacheError,
        );
      }

      logger.info(
        `[RankingService] Completed scoring for ${updates.length} items (batched).`,
      );
      return updates.length;
    } catch (error) {
      logger.error("[RankingService] Error calculating growth scores:", error);
      throw error;
    }
  }

  /**
   * Get cached trending item IDs from Redis.
   * Returns null if cache is empty (caller should fall back to DB).
   */
  static async getCachedTrending(): Promise<
    { id: string; score: number }[] | null
  > {
    try {
      const cached = await RedisUtil.redisClient.get(TRENDING_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
}
