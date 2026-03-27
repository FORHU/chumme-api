import { prisma } from "../../../utils/prisma";
import logger from "../../../utils/logger";

export default class RankingService {
  /**
   * Calculate growth scores for all active social feed items
   * Comparative window: 24 hours
   */
  static async calculateGrowthScores() {
    try {
      logger.info("[RankingService] Starting growth score calculation...");

      // 1. Get all feed items that aren't deleted
      const items = await prisma.socialFeedItem.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          views: true,
          likes: true,
          comments: true,
          bookmarks: true,
        },
      });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let updatedCount = 0;

      for (const item of items) {
        // 2. Find the closest snapshot from ~24h ago
        const snapshot = await prisma.socialFeedSnapshot.findFirst({
          where: {
            socialFeedId: item.id,
            snapshotAt: {
              gte: yesterday,
              lte: now,
            },
          },
          orderBy: {
            snapshotAt: "asc", // Get the oldest one within the last 24h
          },
        });

        let score = 0;

        if (snapshot) {
          // Calculate deltas (momentum)
          const deltaViews = Math.max(0, item.views - snapshot.views);
          const deltaLikes = Math.max(0, item.likes - snapshot.likes);
          const deltaComments = Math.max(0, item.comments - snapshot.comments);
          const deltaBookmarks = Math.max(
            0,
            item.bookmarks - snapshot.bookmarks,
          );

          /**
           * Scoring Algorithm (Momentum-based)
           * Views: 1pt each
           * Likes: 5pts each
           * Comments: 10pts each
           * Bookmarks: 20pts each
           */
          score =
            deltaViews * 1 +
            deltaLikes * 5 +
            deltaComments * 10 +
            deltaBookmarks * 20;
        } else {
          // If no snapshot yet (new item), use initial performance but weight it lower
          score = item.views * 0.1 + item.likes * 1;
        }

        // 3. Update the item's score
        await prisma.socialFeedItem.update({
          where: { id: item.id },
          data: { score },
        });

        updatedCount++;
      }

      logger.info(
        `[RankingService] Completed scoring for ${updatedCount} items.`,
      );
      return updatedCount;
    } catch (error) {
      logger.error("[RankingService] Error calculating growth scores:", error);
      throw error;
    }
  }
}
