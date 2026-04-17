import { prisma } from "../../../utils/prisma";
import { rabbitMQService } from "../../../utils/rabbitmq";
import {
  IngestionJobType,
  IngestionJob,
} from "../../../listeners/ingestion.listener";
import logger from "../../../utils/logger";
import { SocialPlatform } from "@prisma/client";
import RedisUtil from "../../../utils/redis.util";
import RankingService from "./ranking.service";
import { IngestionManager } from "../connectors/platform.service";

export class SchedulingService {
  private static intervalHandle: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
  private static readonly HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

  /**
   * Start the periodic scheduling loop
   */
  static async start(): Promise<void> {
    if (this.intervalHandle) return;

    logger.info("[SchedulingService] Starting periodic ingestion scheduler...");

    // Initial run - Each step isolated to prevent cascade failure if one API fails (e.g. 403)
    try {
      await this.processScheduledTasks();
    } catch (err) {
      logger.error(
        "[SchedulingService] processScheduledTasks failed at startup",
        err,
      );
    }

    try {
      await this.processScoutTasks();
    } catch (err) {
      logger.error(
        "[SchedulingService] processScoutTasks failed at startup",
        err,
      );
    }

    try {
      await this.processLiveHeartbeat();
    } catch (err) {
      const msg = (err as any).message || "";
      if (msg.includes("403") || msg.includes("quota")) {
        logger.warn(
          "[SchedulingService] YouTube API Quota/Forbidden at startup. Skipping live heartbeat sync.",
        );
      } else {
        logger.error(
          "[SchedulingService] processLiveHeartbeat failed at startup",
          err,
        );
      }
    }

    try {
      await RankingService.calculateGrowthScores();
    } catch (err) {
      logger.error(
        "[SchedulingService] calculateGrowthScores failed at startup",
        err,
      );
    }

    this.intervalHandle = setInterval(async () => {
      await this.processScheduledTasks();
      await this.processScoutTasks();
      await RankingService.calculateGrowthScores();
    }, this.CHECK_INTERVAL_MS);

    // Dedicated Live Heartbeat (15 mins)
    setInterval(async () => {
      await this.processLiveHeartbeat();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  static async processScheduledTasks(force: boolean = false): Promise<void> {
    logger.info(
      "[SchedulingService] Checking for scheduled ingestion tasks...",
    );

    try {
      const now = new Date();

      const where: any = {
        isActive: true,
        AND: [],
        OR: [
          { quotaLimitHitAt: null },
          {
            quotaLimitHitAt: {
              lt: new Date(now.getTime() - 1000 * 60 * 60 * 6), // 6h backoff (reduced from 24h)
            },
          },
        ],
      };

      if (!force) {
        where.AND = [
          {
            OR: [
              { lastCrawledAt: null },
              {
                lastCrawledAt: {
                  lt: new Date(now.getTime() - 1000 * 60 * 60),
                },
              },
            ],
          },
        ];
      }

      // Removed hardcoded ENTERTAINMENT trait filter to allow all categories

      const targetsToCrawl = await prisma.socialIngestionTarget.findMany({
        where,
        include: {
          chummeSubCategory: true,
          chummeTopicCategory: true,
          schedules: {
            where: { isActive: true },
          },
        },
      });

      // Filter for precise interval or exact time check
      const dueTargets = targetsToCrawl.filter((target: any) => {
        // If force is true, bypass all timing/interval checks
        if (force) return true;

        // 1. Fallback to original interval if no active schedules exist
        if (!target.schedules || target.schedules.length === 0) {
          // If no schedules, check if the fallback interval has passed
          if (!target.lastCrawledAt) return true;
          const hoursSinceLastCrawl =
            (now.getTime() - target.lastCrawledAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceLastCrawl >= target.crawlIntervalHours;
        }

        // 2. Evaluate schedules
        return target.schedules.some((schedule: any) => {
          if (schedule.mode === "MANUAL") return false; // Skip manual override schedules in auto-loop

          if (schedule.exactTime) {
            const [hourStr] = schedule.exactTime.split(":");
            const schedHour = parseInt(hourStr, 10);
            const currentHour = now.getHours();

            if (currentHour === schedHour) {
              // Throttle: Prevent re-triggering multiple times in the same hour window
              if (
                target.lastCrawledAt &&
                now.getTime() - target.lastCrawledAt.getTime() < 1000 * 60 * 45
              ) {
                return false;
              }
              return true;
            }
          } else if (schedule.intervalHours) {
            if (!target.lastCrawledAt) return true;
            const hoursSinceLastCrawl =
              (now.getTime() - target.lastCrawledAt.getTime()) /
              (1000 * 60 * 60);
            return hoursSinceLastCrawl >= schedule.intervalHours;
          }

          return false;
        });
      });

      logger.info(
        `[SchedulingService] Found ${dueTargets.length} targets due for crawling`,
      );

      for (const target of dueTargets) {
        await this.queueJobForTarget(target);
      }
    } catch (error) {
      logger.error("[SchedulingService] Error during task processing:", error);
    }
  }

  private static async queueJobForTarget(target: any): Promise<void> {
    const targetName =
      target.chummeArtist?.name ||
      target.chummeCategory?.name ||
      target.chummeSubCategory?.name ||
      target.chummeTopicCategory?.name ||
      target.externalHandle;

    logger.info(
      `[SchedulingService] Queuing DISCOVERY job for ${targetName} on ${target.platform}`,
    );

    const job: IngestionJob = {
      type: IngestionJobType.DISCOVERY,
      platform: target.platform,
      targetId: target.externalHandle,
      priority: target.crawlPriority,
      meta: {
        artistId: target.chummeArtistId,
        topicCategoryId: target.chummeTopicCategoryId,
        force: true, // Bypass worker-level deduplication for manual triggers
        // Legacy support for higher levels if needed by platform connectors
        categoryId: target.chummeCategoryId,
        subCategoryId: target.chummeSubCategoryId,
        pageToken: target.nextPageToken || undefined,
      },
    };

    await rabbitMQService.publishMessage(
      `ingestion.${IngestionJobType.DISCOVERY}`,
      job,
      {
        priority: job.priority,
      },
    );

    // Update lastCrawledAt
    await prisma.socialIngestionTarget.update({
      where: { id: target.id },
      data: {
        lastCrawledAt: new Date(),
        quotaLimitHitAt: null,
      },
    });
  }

  /**
   * Scan categories for discovery keywords and trigger scouting searches
   */
  static async processScoutTasks(force: boolean = false): Promise<void> {
    logger.info("[SchedulingService] Running category-based talent scout...");

    try {
      const topicCategories = await prisma.chummeTopicCategory.findMany({
        where: {
          OR: [
            { discoveryKeywords: { isEmpty: false } },
            { channelId: { isEmpty: false } },
          ],
        },
        select: { id: true },
      });

      // 2. Process each category level
      for (const topic of topicCategories) {
        await this.scoutTopicCategory(topic.id, force);
      }
    } catch (error) {
      logger.error("[SchedulingService] Error during scout processing:", error);
    }
  }

  static async scoutTopicCategory(
    id: string,
    force: boolean = false,
  ): Promise<void> {
    const item = await prisma.chummeTopicCategory.findUnique({ where: { id } });
    if (!item) return;

    // Frequency control: Only scout each level once every 24 hours
    const scoutKey = `scout:topicCategory:${id}`;
    if (
      !force &&
      (await RedisUtil.isDuplicate("discovery", scoutKey, 24 * 60 * 60))
    ) {
      logger.info(
        `[SchedulingService] Skipping scout for topicCategory [${id}] (already scouted in the last 24h)`,
      );
      return;
    }

    const { channelId, discoveryKeywords } = item;

    // 1. Direct Channel Discovery (Priority)
    if (channelId && channelId.length > 0) {
      for (const cid of channelId) {
        logger.info(
          `[SchedulingService] Direct discovery for topicCategory [${id}] with channelId: "${cid}"`,
        );

        const job: IngestionJob = {
          type: IngestionJobType.DISCOVERY,
          platform: SocialPlatform.YOUTUBE,
          targetId: cid,
          priority: 2,
          meta: {
            topicCategoryId: id,
          },
        };

        await rabbitMQService.publishMessage(
          `ingestion.${IngestionJobType.DISCOVERY}`,
          job,
        );
      }
    }

    // 2. Keyword Search (Fallback if no channelId, or in addition if both present)
    if (discoveryKeywords && discoveryKeywords.length > 0) {
      for (const keyword of discoveryKeywords) {
        logger.info(
          `[SchedulingService] Scouting topicCategory [${id}] with keyword: "${keyword}"`,
        );

        const job: IngestionJob = {
          type: IngestionJobType.SEARCH,
          platform: SocialPlatform.YOUTUBE,
          targetId: keyword,
          priority: 1,
          meta: {
            topicCategoryId: id,
          },
        };

        await rabbitMQService.publishMessage(
          `ingestion.${IngestionJobType.SEARCH}`,
          job,
        );
      }
    }
  }

  static async triggerTargetIngestion(targetId: string): Promise<void> {
    const target = await prisma.socialIngestionTarget.findUnique({
      where: { id: targetId },
      include: {
        chummeArtist: true,
        chummeCategory: true,
        chummeSubCategory: true,
        chummeTopicCategory: true,
      },
    });

    if (!target) {
      throw new Error(`SocialIngestionTarget with ID ${targetId} not found`);
    }

    await this.queueJobForTarget(target);
  }

  static async triggerContentRefresh(
    platform: SocialPlatform,
    externalId: string,
  ): Promise<void> {
    const job: IngestionJob = {
      type: IngestionJobType.METADATA,
      platform,
      targetId: externalId,
      priority: 5, // High priority for manual refresh
    };

    await rabbitMQService.publishMessage(
      `ingestion.${IngestionJobType.METADATA}`,
      job,
      { priority: job.priority },
    );

    logger.info(
      `[SchedulingService] Manually triggered METADATA refresh for ${platform}:${externalId}`,
    );
  }

  static stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * High-priority refresh for Artist live status and basic channel stats.
   * Runs more frequently (15m) than full crawls (1h+).
   */
  static async processLiveHeartbeat(): Promise<void> {
    logger.info("[SchedulingService] Running Live Heartbeat for artists...");

    try {
      // 1. Get all YouTube targets linked to an artist
      const targets = await prisma.socialIngestionTarget.findMany({
        where: {
          platform: SocialPlatform.YOUTUBE,
          chummeArtistId: { not: null },
          isActive: true,
        },
        select: {
          externalHandle: true,
          chummeArtistId: true,
        },
      });

      if (targets.length === 0) return;

      // 2. Group into batches of 50 (YouTube API limit)
      const batches: any[][] = [];
      for (let i = 0; i < targets.length; i += 50) {
        batches.push(targets.slice(i, i + 50));
      }

      const connector = IngestionManager.getConnector(SocialPlatform.YOUTUBE);
      if (!connector.getChannelsMetadata) return;

      for (const batch of batches) {
        const channelIds = batch.map((t) => t.externalHandle);
        const metadataList = await connector.getChannelsMetadata(channelIds);

        // 3. Update each artist's stats and live status
        for (const target of batch) {
          const meta = metadataList.find((m) => m.id === target.externalHandle);
          if (!meta) continue;

          const stats = meta.statistics;
          const isLive = await connector.getChannelLiveStatus!(
            target.externalHandle,
          );

          await prisma.chummeArtist.update({
            where: { id: target.chummeArtistId },
            data: {
              isLive,
              subscriberCount: parseInt(stats?.subscriberCount || "0"),
              totalViews: BigInt(stats?.viewCount || "0"),
              lastLiveAt: isLive ? new Date() : undefined,
            },
          });
        }
      }

      logger.info(
        `[SchedulingService] Live Heartbeat sync complete for ${targets.length} artists.`,
      );
    } catch (error) {
      logger.error("[SchedulingService] Error in Live Heartbeat:", error);
    }
  }
}
