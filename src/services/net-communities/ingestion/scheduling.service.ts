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

  static async processScheduledTasks(force: boolean = false, platform?: string): Promise<void> {
    const activeSetting = await prisma.systemSetting.findUnique({
      where: { key: "CHAIN_ACTIVE" },
    });
    const isChainActive = activeSetting ? activeSetting.value === "true" : false;

    if (isChainActive && !force && !platform) {
       logger.info("[SchedulingService] Sequential chain is active. Delegating automated cron run to chain execution.");
       await this.startSequentialChain();
       return;
    }

    const platformSettings = await prisma.systemSetting.findMany({
      where: { key: { endsWith: "_SCHEDULER" }, isScheduled: true }
    });

    if (!force && platformSettings.length === 0) {
      logger.info("[SchedulingService] No platform schedulers are enabled. Skipping...");
      return;
    }

    logger.info(
      "[SchedulingService] Checking for scheduled ingestion tasks...",
    );

    try {
      const now = new Date();
      const enabledPlatforms = platformSettings.map(s => s.key.split('_')[0]);

      const where: any = {
        isActive: true,
        ...(platform ? { platform: platform.toUpperCase() as any } : (!force ? { platform: { in: enabledPlatforms as any[] } } : {})),
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

      // 4. Restrict to ENTERTAINMENT traits on subcategory and topic levels
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          {
            chummeSubCategory: {
              chummeCategory: { chummeTrait: "ENTERTAINMENT" },
            },
          },
          {
            chummeTopicCategory: {
              chummeSubCategory: {
                chummeCategory: { chummeTrait: "ENTERTAINMENT" },
              },
            },
          },
        ],
      });

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

      // Filter for precise interval or exact time check using Platform Settings
      const dueTargets = targetsToCrawl.filter((target: any) => {
        const platformSetting = platformSettings.find(s => s.key === `${target.platform}_SCHEDULER`);
        
        // Use Platform Setting if available and active
        if (platformSetting && !force) {
          const settingValue = platformSetting.value || "24";
          if (settingValue.includes(":")) {
            const [hourStr] = settingValue.split(":");
            const schedHour = parseInt(hourStr, 10);
            if (now.getHours() === schedHour) {
              if (target.lastCrawledAt && now.getTime() - target.lastCrawledAt.getTime() < 1000 * 60 * 45) {
                return false; // Throttled
              }
              return true;
            }
            return false;
          } else {
            const intervalHours = parseInt(settingValue, 10) || 24;
            if (!target.lastCrawledAt) return true;
            return (now.getTime() - target.lastCrawledAt.getTime()) / (1000 * 60 * 60) >= intervalHours;
          }
        }

        // 1. Fallback to original interval if no active schedules exist
        if (!target.schedules || target.schedules.length === 0) {
          if (!target.lastCrawledAt) return true;
          const hoursSinceLastCrawl =
            (now.getTime() - target.lastCrawledAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceLastCrawl >= target.crawlIntervalHours;
        }

        // 2. Evaluate target-specific schedules (legacy)
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

      // 🔗 Sequential Chaining: Advance step if zero items
      if (platform) {
        if (dueTargets.length === 0) {
          logger.info(`[SchedulingService] No targets due for sequential sync on ${platform}. Skipping to next step.`);
          await this.triggerNextStep();
          return; // Exit early since we advanced
        } else {
          await RedisUtil.redisClient.set(`chain_pending_jobs:${platform.toLowerCase()}`, dueTargets.length.toString());
          logger.info(`[SchedulingService] Initialized Redis tracking counter for platform ${platform} to ${dueTargets.length}`);
          await this.broadcastStatus();
        }
      }

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
  static async processScoutTasks(): Promise<void> {
    const platformSettings = await prisma.systemSetting.findMany({
      where: { key: { endsWith: "_SCHEDULER" }, isScheduled: true }
    });

    if (platformSettings.length === 0) {
      logger.info(
        "[SchedulingService] No platform schedulers are enabled. Skipping category-based talent scout...",
      );
      return;
    }

    logger.info("[SchedulingService] Running category-based talent scout...");

    try {
      const subCategories = await prisma.chummeSubCategory.findMany({
        where: { discoveryKeywords: { isEmpty: false } },
        include: { chummeCategory: true }
      });

      const topicCategories = await prisma.chummeTopicCategory.findMany({
        where: { discoveryKeywords: { isEmpty: false } },
        include: { chummeSubCategory: { include: { chummeCategory: true } } }
      });

      let allItems = [
        ...subCategories.map((s) => ({
          id: s.id,
          keywords: s.discoveryKeywords,
          type: "subCategory",
          categoryId: s.chummeCategoryId,
        })),
        ...topicCategories.map((t) => ({
          id: t.id,
          keywords: t.discoveryKeywords,
          type: "topicCategory",
          categoryId: t.chummeSubCategory?.chummeCategoryId,
        })),
      ];

      // 🛡️ API Quota Protection: Randomize and pick top 15 items per hour 
      logger.info(`[SchedulingService] Found ${allItems.length} total scout items. Throttling to index random order for API Quota safety...`);
      allItems = allItems.sort(() => Math.random() - 0.5).slice(0, 15);

      for (const item of allItems) {
        for (const keyword of item.keywords) {
          // 🛡️ API Quota Protection + History: Only scout this EXACT keyword once every 24 hours
          const lastLog = await prisma.socialScoutLog.findFirst({
            where: {
              type: item.type,
              targetId: item.id,
              keyword: keyword,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24h
              },
            },
          });

          if (lastLog) {
            logger.info(
              `[SchedulingService] Skipping scout for ${item.type} [${item.id}] keyword "${keyword}" (already searched in last 24h)`
            );
            continue;
          }

          logger.info(
            `[SchedulingService] Scouting ${item.type} [${item.id}] with keyword: "${keyword}"`,
          );

          // 📝 Create History Log Execution
          await prisma.socialScoutLog.create({
            data: {
              type: item.type,
              targetId: item.id,
              keyword: keyword,
              platform: SocialPlatform.YOUTUBE,
              videosFound: 10, // Default limit constant
              chummeSubCategoryId: item.type === "subCategory" ? item.id : undefined,
              chummeTopicCategoryId: item.type === "topicCategory" ? item.id : undefined,
            },
          });

          const job: IngestionJob = {
            type: IngestionJobType.SEARCH,
            platform: SocialPlatform.YOUTUBE, // Start with YouTube scouting
            targetId: keyword,
            priority: 1,
            meta: {
              categoryId: item.categoryId,
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

// Obsolete isSchedulerEnabled method removed in favor of platform scheduling

  /**
   * Broadcast light-weight live status state to Socket.IO clients
   */
  static async broadcastStatus(): Promise<void> {
    const { prisma } = require("../../../utils/prisma");
    const RedisUtil = require("../../../utils/redis.util").default;

    try {
      const activeSetting = await prisma.systemSetting.findUnique({
        where: { key: "CHAIN_ACTIVE" },
      });
      const isActive = activeSetting ? activeSetting.value === "true" : false;

      const platformSettings = await prisma.systemSetting.findMany({
        where: { key: { endsWith: "_SCHEDULER" }, isScheduled: true },
        orderBy: { order: "asc" }
      });
      const chain = platformSettings.map((s: any) => s.key.split("_")[0]);

      const stepSetting = await prisma.systemSetting.findUnique({
        where: { key: "CURRENT_CHAIN_STEP" },
      });
      const currentStep = stepSetting ? stepSetting.value : (chain[0] || "None");

      let pendingJobs = 0;
      if (currentStep && currentStep !== "None") {
        const platform = currentStep.toLowerCase();
        const count = await RedisUtil.redisClient.get(`chain_pending_jobs:${platform}`);
        pendingJobs = count ? parseInt(count, 10) : 0;
      }

      const currentIndex = chain.indexOf(currentStep);
      const nextIndex = currentIndex + 1 >= chain.length ? 0 : currentIndex + 1;
      const nextStep = chain.length > 0 ? chain[nextIndex] : "None";

      const status = {
        isActive,
        currentStep,
        nextStep,
        chain,
        pendingJobs: Math.max(0, pendingJobs),
        timestamp: new Date()
      };

      if ((global as any).io) {
         (global as any).io.emit("chain:status", status);
      }
    } catch (error) {
       logger.error("[SchedulingService] Failed to broadcast status:", error);
    }
  }

  /**
   * Advance the sequential crawling chain step index and trigger the next platform
   */
  static async triggerNextStep(): Promise<void> {
    const { prisma } = require("../../../utils/prisma");
    try {
      const activeSetting = await prisma.systemSetting.findUnique({
        where: { key: "CHAIN_ACTIVE" },
      });
      if (!activeSetting || activeSetting.value !== "true") {
        logger.info("[SchedulingService] Sequential chain inactive or paused. Skipping advancing.");
        return;
      }

      const platformSettings = await prisma.systemSetting.findMany({
        where: { key: { endsWith: "_SCHEDULER" }, isScheduled: true },
        orderBy: { order: "asc" }
      });
      const chain = platformSettings.map((s: any) => s.key.split("_")[0]);

      if (chain.length === 0) {
        logger.warn("[SchedulingService] CRAWL_CHAIN is empty or no platforms are scheduled.");
        return;
      }

      const stepSetting = await prisma.systemSetting.findUnique({
        where: { key: "CURRENT_CHAIN_STEP" },
      });
      const currentStep = stepSetting ? stepSetting.value : chain[0];
      
      let currentIndex = chain.indexOf(currentStep);
      let nextIndex = currentIndex + 1;

      if (nextIndex >= chain.length) {
        logger.info("[SchedulingService] Reached end of sequence chain. Stopping until next scheduled cycle.");
        
        await prisma.systemSetting.upsert({
          where: { key: "CURRENT_CHAIN_STEP" },
          update: { value: "None" },
          create: { key: "CURRENT_CHAIN_STEP", value: "None" },
        });

        await this.broadcastStatus();
        return; 
      }

      const nextStep = chain[nextIndex];

      logger.info(`[SchedulingService] Advancing chain from ${currentStep} to ${nextStep}`);

      await prisma.systemSetting.upsert({
        where: { key: "CURRENT_CHAIN_STEP" },
        update: { value: nextStep },
        create: { key: "CURRENT_CHAIN_STEP", value: nextStep },
      });

      await this.broadcastStatus();

      // Trigger next step execution
      await this.processScheduledTasks(false, nextStep);

    } catch (error) {
      logger.error("[SchedulingService] Error triggering next step in chain:", error);
    }
  }

  /**
   * Manually kick off the sequential chain from step 0
   */
  static async startSequentialChain(): Promise<void> {
    const { prisma } = require("../../../utils/prisma");
    try {
      const platformSettings = await prisma.systemSetting.findMany({
        where: { key: { endsWith: "_SCHEDULER" }, isScheduled: true },
        orderBy: { order: "asc" }
      });
      const chain = platformSettings.map((s: any) => s.key.split("_")[0]);

      if (chain.length > 0) {
        await prisma.systemSetting.upsert({
          where: { key: "CURRENT_CHAIN_STEP" },
          update: { value: chain[0] },
          create: { key: "CURRENT_CHAIN_STEP", value: chain[0] },
        });

        await prisma.systemSetting.upsert({
          where: { key: "CHAIN_ACTIVE" },
          update: { value: "true" },
          create: { key: "CHAIN_ACTIVE", value: "true" },
        });

        logger.info(`[SchedulingService] Chain started manual trigger at platform: ${chain[0]}`);
        await this.processScheduledTasks(false, chain[0]);
      }
    } catch (error) {
      logger.error("[SchedulingService] Error starting sequential chain:", error);
    }
  }

  static stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}
