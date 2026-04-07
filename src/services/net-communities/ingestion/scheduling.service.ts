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

export class SchedulingService {
  private static intervalHandle: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

  /**
   * Start the periodic scheduling loop
   */
  static async start(): Promise<void> {
    if (this.intervalHandle) return;

    logger.info("[SchedulingService] Starting periodic ingestion scheduler...");

    // Initial run
    await this.processScheduledTasks();
    await this.processScoutTasks();
    await RankingService.calculateGrowthScores();

    this.intervalHandle = setInterval(async () => {
      await this.processScheduledTasks();
      await this.processScoutTasks();
      await RankingService.calculateGrowthScores();
    }, this.CHECK_INTERVAL_MS);
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
              lt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 24h backoff
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

      if (!force) {
        where.AND.push({
          OR: [
            {
              chummeCategory: { chummeTraits: "ENTERTAINMENT" },
            },
            {
              chummeSubCategory: {
                chummeCategory: { chummeTraits: "ENTERTAINMENT" },
              },
            },
            {
              chummeTopicCategory: {
                chummeSubCategory: {
                  chummeCategory: { chummeTraits: "ENTERTAINMENT" },
                },
              },
            },
          ],
        });
      }

      const targetsToCrawl = await prisma.socialIngestionTarget.findMany({
        where,
        include: {
          chummeArtist: true,
          chummeCategory: true,
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
        categoryId: target.chummeCategoryId,
        subCategoryId: target.chummeSubCategoryId,
        topicCategoryId: target.chummeTopicCategoryId,
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
      // 1. Get all categories with keywords
      const categories = await prisma.chummeCategory.findMany({
        where: { discoveryKeywords: { isEmpty: false } },
      });

      const subCategories = await prisma.chummeSubCategory.findMany({
        where: { discoveryKeywords: { isEmpty: false } },
      });

      const topicCategories = await prisma.chummeTopicCategory.findMany({
        where: { discoveryKeywords: { isEmpty: false } },
      });

      const allItems = [
        ...categories.map((c) => ({
          id: c.id,
          keywords: c.discoveryKeywords,
          type: "category",
        })),
        ...subCategories.map((s) => ({
          id: s.id,
          keywords: s.discoveryKeywords,
          type: "subCategory",
        })),
        ...topicCategories.map((t) => ({
          id: t.id,
          keywords: t.discoveryKeywords,
          type: "topicCategory",
        })),
      ];

      for (const item of allItems) {
        // Frequency control: Only scout each category level once every 24 hours
        // If force is true, bypass this check
        const scoutKey = `scout:${item.type}:${item.id}`;
        if (
          !force &&
          (await RedisUtil.isDuplicate("discovery", scoutKey, 24 * 60 * 60))
        ) {
          logger.info(
            `[SchedulingService] Skipping scout for ${item.type} [${item.id}] (already scouted in the last 24h)`,
          );
          continue;
        }

        for (const keyword of item.keywords) {
          logger.info(
            `[SchedulingService] Scouting ${item.type} [${item.id}] with keyword: "${keyword}"`,
          );

          const job: IngestionJob = {
            type: IngestionJobType.SEARCH,
            platform: SocialPlatform.YOUTUBE, // Start with YouTube scouting
            targetId: keyword,
            priority: 1,
            meta: {
              categoryId: item.type === "category" ? item.id : undefined,
              subCategoryId: item.type === "subCategory" ? item.id : undefined,
              topicCategoryId:
                item.type === "topicCategory" ? item.id : undefined,
            },
          };

          await rabbitMQService.publishMessage(
            `ingestion.${IngestionJobType.SEARCH}`,
            job,
          );
        }
      }
    } catch (error) {
      logger.error("[SchedulingService] Error during scout processing:", error);
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
}
