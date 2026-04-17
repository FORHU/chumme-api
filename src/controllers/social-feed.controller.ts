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
      const chummeArtistId = req.query.chummeArtistId as string | undefined;
      const cursor = req.query.cursor as string | undefined;

      const countryCode = req.headers["x-country-code"] as string | undefined;
      const feed = await SocialFeedSvc.getFeed(
        page,
        limit,
        countryCode,
        chummeArtistId,
        cursor,
      );

      const nextCursor =
        feed.length === limit ? (feed[feed.length - 1] as any)?.id : undefined;

      res.setHeader("X-Cache", (feed as any)._cacheHit ? "HIT" : "MISS");
      res.json({
        success: true,
        data: feed,
        pagination: {
          page: cursor ? undefined : page,
          limit,
          hasMore: feed.length === limit,
          nextCursor,
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
      const chummeArtistId = req.query.chummeArtistId as string | undefined;
      const cursor = req.query.cursor as string | undefined;
      const countryCode = req.headers["x-country-code"] as string | undefined;
      const feed = await SocialFeedSvc.getPersonalizedFeed(
        userId,
        page,
        limit,
        countryCode,
        chummeArtistId,
        cursor,
      );

      const nextCursor =
        feed?.length === limit
          ? (feed[feed.length - 1] as any)?.id
          : undefined;

      res.setHeader("X-Cache", (feed as any)._cacheHit ? "HIT" : "MISS");

      res.json({
        success: true,
        data: feed,
        pagination: {
          page: cursor ? undefined : page,
          limit,
          hasMore: feed?.length === limit,
          nextCursor,
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
   * Create a comment on a feed item
   * POST /api/feed/:id/comment
   */
  static async createComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Content is required" });
      }
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Comment is too long (max 1000 characters)",
        });
      }

      const comment = await SocialFeedSvc.createFeedItemComment(
        id,
        userId,
        content,
      );
      return res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
      if (error.message === "Feed item not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create comment",
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
