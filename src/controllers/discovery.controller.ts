import { Request, Response } from "express";
import { SocialPlatform } from "@prisma/client";
import {
  IngestionJob,
  IngestionJobType,
} from "../listeners/ingestion.listener";
import SocialFeedRepo from "../repositories/social-feed.repository";
import * as ArtistRepo from "../repositories/chumme-artist.repository";
import { SchedulingService } from "../services/net-communities/ingestion/scheduling.service";
import { QuotaService } from "../services/net-communities/ingestion/quota.service";
import YouTubeService from "../services/net-communities/youtube.service";
import logger from "../utils/logger";
import { prisma } from "../utils/prisma";
import { rabbitMQService } from "../utils/rabbitmq";

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

      // 3. Get current quota usage for the response
      const quotaUsedToday = await QuotaService.getUsage();

      return res.json({
        message: "Full video crawl and scouting process triggered successfully",
        data: {
          quotaUsedToday,
        },
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

  /**
   * Manually trigger a crawl for a single YouTube channel id (Admin only)
   */
  static async triggerCrawlerByTargetId(req: Request, res: Response) {
    try {
      const channelId = req.params.targetId?.trim();

      if (!channelId) {
        return res.status(400).json({ message: "channelId is required" });
      }

      const channel = await YouTubeService.getChannel({ channelId });
      if (!channel) {
        return res
          .status(404)
          .json({ message: "YouTube channel not found for this channelId" });
      }

      const channelName = channel.snippet?.title || `YouTube-${channelId}`;
      const channelImageUrl = channel.snippet?.thumbnails?.high?.url;
      const channelHandle = channel.snippet?.customUrl || channelId;

      const existingArtist = await prisma.chummeArtist.findFirst({
        where: {
          platform: "YOUTUBE",
          socialPlatformUsername: channelId,
        },
      });

      const artist = existingArtist
        ? await prisma.chummeArtist.update({
            where: { id: existingArtist.id },
            data: {
              name: channelName,
              imageUrl: channelImageUrl ?? existingArtist.imageUrl,
              socialPlatformUsername: channelId,
              platform: "YOUTUBE",
              isDeleted: false,
            },
          })
        : await prisma.chummeArtist.create({
            data: {
              name: channelName,
              imageUrl: channelImageUrl,
              socialPlatformUsername: channelId,
              platform: "YOUTUBE",
              isDraft: true,
              discoveredAt: new Date(),
            },
          });

      await prisma.socialIngestionTarget.upsert({
        where: {
          platform_externalHandle: {
            platform: SocialPlatform.YOUTUBE,
            externalHandle: channelId,
          },
        },
        update: {
          chummeArtistId: artist.id,
          isActive: true,
          quotaLimitHitAt: null,
        },
        create: {
          platform: SocialPlatform.YOUTUBE,
          externalHandle: channelId,
          chummeArtistId: artist.id,
          isActive: true,
          crawlIntervalHours: 48,
          crawlPriority: 1,
        },
      });

      logger.info(
        `[DiscoveryController] Manually triggering crawl for channel: ${channelId}, artist: ${artist.id}`,
      );

      const job: IngestionJob = {
        type: IngestionJobType.DISCOVERY,
        platform: SocialPlatform.YOUTUBE,
        targetId: channelId,
        priority: 1,
        meta: {
          force: true,
          artistId: artist.id,
          artistHandle: channelHandle,
          maxItems: 100,
        },
      };

      await rabbitMQService.publishMessage(
        `ingestion.${IngestionJobType.DISCOVERY}`,
        job,
        { priority: job.priority },
      );

      const quotaUsedToday = await QuotaService.getUsage();

      return res.json({
        message: "Targeted channel crawl triggered successfully",
        data: {
          channelId,
          chummeArtistId: artist.id,
          channelName: artist.name,
          platform: SocialPlatform.YOUTUBE,
          maxItems: 100,
          quotaUsedToday,
        },
      });
    } catch (error: any) {
      logger.error(
        "[DiscoveryController] Error triggering targeted crawl:",
        error,
      );
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }
}
