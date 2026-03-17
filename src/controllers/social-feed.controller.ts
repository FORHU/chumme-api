import { Request, Response } from "express";
import SocialFeedSvc from "../services/social-feed.service";

export default class SocialFeedCtrl {
  /**
   * Get unified feed (posts + videos)
   * GET /api/feed?page=0&limit=20
   */
  static async getFeed(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 5;
      const refresh = req.query.refresh === "true";
      const seed = req.query.seed as string;

      const countryCode = req.headers["x-country-code"] as string | undefined;
      const feed = await SocialFeedSvc.getFeed(page, limit, refresh, seed, countryCode);

      res.json({
        success: true,
        data: feed,
        pagination: {
          page,
          limit,
          hasMore: feed.length === limit,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get personalized feed based on user preferences
   * GET /api/feed/personalized?page=0&limit=20
   * Requires authentication
   */
  static async getPersonalizedFeed(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      const refresh = req.query.refresh === "true";

      const artist = req.query.artist as string;
      const seed = (req.query.seed || req.query.seed_id) as string;

      const countryCode = req.headers["x-country-code"] as string | undefined;
      const feed = await SocialFeedSvc.getPersonalizedFeed(
        userId,
        page,
        limit,
        artist,
        refresh,
        seed,
        countryCode,
      );

      res.json({
        success: true,
        data: feed,
        pagination: {
          page,
          limit,
          hasMore: feed?.length === limit,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get comments for a feed item (scraped + local)
   * GET /api/feed/:id/comments
   */
  static async getComments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const comments = await SocialFeedSvc.getFeedItemComments(id);

      res.json({
        success: true,
        data: comments,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
