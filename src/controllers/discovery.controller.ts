import { Request, Response } from "express";
import SocialFeedRepo from "../repositories/social-feed.repository";
import * as ArtistRepo from "../repositories/chumme-artist.repository";
import RankingService from "../services/net-communities/ingestion/ranking.service";
import { SchedulingService } from "../services/net-communities/ingestion/scheduling.service";
import logger from "../utils/logger";

export default class DiscoveryController {
  /**
   * Get trending social content
   */
  static async getTrending(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;

      const items = await SocialFeedRepo.getTrendingFeed(page, limit);

      return res.json({
        message: "Trending content fetched successfully",
        data: items,
        pagination: { page, limit, hasMore: items.length === limit },
      });
    } catch (error: any) {
      logger.error(
        "[DiscoveryController] Error fetching trending content:",
        error,
      );
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Get rising stars (draft artists with high potential)
   */
  static async getRisingStars(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const stars = await ArtistRepo.getRisingStars(limit);

      return res.json({
        message: "Rising stars fetched successfully",
        data: stars,
      });
    } catch (error: any) {
      logger.error("[DiscoveryController] Error fetching rising stars:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Manually trigger a ranking calculation (Admin only)
   */
  static async triggerRankingCalculation(req: Request, res: Response) {
    try {
      const count = await RankingService.calculateGrowthScores();
      return res.json({
        message: `Ranking calculation completed for ${count} items`,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Manually trigger a full video crawl and scouting process (Admin only)
   */
  static async triggerCrawl(req: Request, res: Response) {
    try {
      logger.info(
        "[DiscoveryController] Manually triggering full video crawl...",
      );

      // 1. Process scheduled ingestion targets (forced)
      await SchedulingService.processScheduledTasks(true);

      // 2. Process category scouting searches (forced)
      await SchedulingService.processScoutTasks(true);

      return res.json({
        message: "Full video crawl and scouting process triggered successfully",
      });
    } catch (error: any) {
      logger.error(
        "[DiscoveryController] Error triggering manual crawl:",
        error,
      );
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }
}
