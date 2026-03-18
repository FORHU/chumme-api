import amqp from "amqplib";
import { MessageHandler, rabbitMQService } from "../utils/rabbitmq";
import logger from "../utils/logger";
import { SocialPlatform } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { IngestionManager } from "../services/net-communities/connectors/platform.service";
import SocialFeedSvc from "../services/social-feed.service";
import RedisUtil from "../utils/redis.util";
import SocialUserDiscoverySvc from "../services/social-user-discovery.service";

// Ensure connectors are registered
import "../services/net-communities/connectors/youtube-connector.service";
import "../services/net-communities/connectors/tiktok-connector.service";
import "../services/net-communities/connectors/instagram-connector.service";

export enum IngestionJobType {
  DISCOVERY = "discovery",
  METADATA = "metadata",
  STATS = "stats",
  ENRICHMENT = "enrichment",
  SEARCH = "search",
}

export interface IngestionJob {
  type: IngestionJobType;
  platform: SocialPlatform;
  targetId: string; // channelId or contentId
  priority: number;
  meta?: any;
}

export class IngestionWorker {
  private readonly queueName = "ingestion_jobs";
  private readonly routingKeys = ["ingestion.*"];

  async start(): Promise<void> {
    logger.info("[IngestionWorker] Starting...");
    await rabbitMQService.subscribeToMessages(
      this.queueName,
      this.routingKeys,
      this.handleMessage.bind(this),
    );
    logger.info("[IngestionWorker] Subscribed to ingestion jobs");
  }

  private handleMessage: MessageHandler = async (
    message: IngestionJob,
    originalMsg: amqp.ConsumeMessage,
  ) => {
    logger.info(
      `[IngestionWorker] Processing ${message.type} job for ${message.platform}:${message.targetId}`,
    );

    try {
      // 1. Deduplication check
      const dedupKey = `${message.platform}:${message.targetId}`;
      if (await RedisUtil.isDuplicate(message.type, dedupKey)) {
        logger.info(
          `[IngestionWorker] Skipping duplicate job: ${message.type} for ${dedupKey}`,
        );
        return;
      }

      // 2. Rate limiting check (e.g., 50 requests per minute per platform)
      if (await RedisUtil.isRateLimited(message.platform, 50, 60)) {
        logger.warn(
          `[IngestionWorker] Rate limit exceeded for platform: ${message.platform}`,
        );
        // Throw error to trigger Dead Letter Queue routing instead of dropping job
        throw new Error(
          `Rate limit exceeded for platform: ${message.platform}`,
        );
      }

      const startTime = Date.now();
      let status: "success" | "failed" = "success";

      try {
        switch (message.type) {
          case IngestionJobType.DISCOVERY:
            await this.handleDiscoveryJob(message);
            break;
          case IngestionJobType.METADATA:
            await this.handleMetadataJob(message);
            break;
          case IngestionJobType.STATS:
            await this.handleStatsJob(message);
            break;
          case IngestionJobType.ENRICHMENT:
            await this.handleEnrichmentJob(message);
            break;
          case IngestionJobType.SEARCH:
            await this.handleSearchJob(message);
            break;
          default:
            logger.warn(`[IngestionWorker] Unknown job type: ${message.type}`);
            status = "failed";
        }
      } catch (error) {
        status = "failed";
        throw error;
      } finally {
        const durationMs = Date.now() - startTime;
        const { workerMetrics } = require("../utils/worker-metrics");
        workerMetrics.recordJob({
          jobId: `${message.platform}:${message.targetId}`,
          jobType: `ingestion:${message.type}`,
          durationMs,
          status,
        });

        // 🔗 Sequential Chaining: Decrement Counter
        const isChainJob = [IngestionJobType.DISCOVERY, IngestionJobType.SEARCH].includes(message.type);
        if (isChainJob) {
          const key = `chain_pending_jobs:${message.platform.toLowerCase()}`;
          try {
            const { SchedulingService } = require("../services/net-communities/ingestion/scheduling.service");
            const count = await RedisUtil.redisClient.decr(key);
            
            // 🔗 Live WebSocket Update for decrement
            await SchedulingService.broadcastStatus();

            if (count === 0) {
              logger.info(`[IngestionWorker] Platform ${message.platform} sync completed. triggering next step in chain.`);
              await SchedulingService.triggerNextStep();
            }
          } catch (err) {
            logger.error(`[IngestionWorker] Error processing chain decrement for ${message.platform}:`, err);
          }
        }
      }
    } catch (error) {
      logger.error(
        `[IngestionWorker] Error processing job ${message.type} for ${message.platform}:${message.targetId}:`,
        error,
      );
      throw error;
    }
  };

  private async handleDiscoveryJob(job: IngestionJob) {
    const connector = IngestionManager.getConnector(job.platform);

    let result;
    try {
      result = await connector.getChannelContent(
        job.targetId,
        20,
        job.meta?.pageToken,
      );
    } catch (error: any) {
      if (error.message?.includes("quotaExceeded") || error.code === 403) {
        logger.warn(
          `[IngestionWorker] YouTube Daily Quota Exceeded for ${job.targetId}. Saving state in DB.`,
        );
        await prisma.socialIngestionTarget.updateMany({
          where: { platform: job.platform, externalHandle: job.targetId },
          data: {
            nextPageToken: job.meta?.pageToken || null,
            quotaLimitHitAt: new Date(),
          },
        });
        return; // Graceful stop, do not throw as DLQ cannot solve quota waits
      }
      throw error;
    }

    const items = result.items;
    const nextPageToken = result.nextPageToken;

    logger.info(
      `[IngestionWorker] Discovered ${items.length} items for ${job.platform}:${job.targetId}`,
    );

    for (const item of items) {
      // 1. Initial upsert to register the content
      await SocialFeedSvc.upsertExternalMedia({
        externalUrl: item.url,
        title: item.title || "Social Media Content",
        socialPlatform: item.platform,
        metaData: item.metaData,
        chummeArtistId: job.meta?.artistId,
        chummeCategoryId: job.meta?.categoryId,
        chummeSubCategoryId: job.meta?.subCategoryId,
        chummeTopicCategoryId: job.meta?.topicCategoryId,
      } as any);

      // 2. Queue metadata job for full enrichment with priority
      const routingKey = `ingestion.${IngestionJobType.METADATA}`;
      await rabbitMQService.publishMessage(
        routingKey,
        {
          type: IngestionJobType.METADATA,
          platform: item.platform,
          targetId: item.id,
          priority: job.priority,
          meta: job.meta,
        },
        {
          priority: job.priority,
        },
      );
    }

    // 🆕 Recursive Pagination Loop
    if (nextPageToken) {
      logger.info(
        `[IngestionWorker] Triggering next page sync for ${job.targetId}`,
      );
      const routingKey = `ingestion.${IngestionJobType.DISCOVERY}`;
      await rabbitMQService.publishMessage(routingKey, {
        ...job,
        meta: {
          ...job.meta,
          pageToken: nextPageToken,
        },
      });
    }
  }

  private async handleMetadataJob(job: IngestionJob) {
    const connector = IngestionManager.getConnector(job.platform);
    const details = await connector.getContentDetails(job.targetId);

    if (details) {
      const { item } = await SocialFeedSvc.upsertExternalMedia({
        externalUrl: details.url,
        title: details.title || "Social Media Content",
        socialPlatform: details.platform,
        metaData: details.metaData,
        chummeArtistId: job.meta?.artistId,
        chummeCategoryId: job.meta?.categoryId,
        chummeSubCategoryId: job.meta?.subCategoryId,
        chummeTopicCategoryId: job.meta?.topicCategoryId,
        views: details.stats?.views,
        likes: details.stats?.likes,
        comments: details.stats?.comments,
      } as any);
      logger.info(
        `[IngestionWorker] Metadata updated for ${details.platform}:${details.id}`,
      );

      // Fetch and save comments if supported by connector
      if (connector.getComments) {
        try {
          const comments = await connector.getComments(job.targetId);
          await SocialFeedSvc.saveExternalComments(item.id, comments);
          logger.info(
            `[IngestionWorker] Saved ${comments.length} comments for ${job.platform}:${job.targetId}`,
          );
        } catch (err) {
          logger.warn(
            `[IngestionWorker] Failed to fetch comments for ${job.targetId}:`,
            err,
          );
        }
      }

      // Trigger AI Enrichment job
      await rabbitMQService.publishMessage(
        `ingestion.${IngestionJobType.ENRICHMENT}`,
        {
          type: IngestionJobType.ENRICHMENT,
          platform: details.platform,
          targetId: details.id,
          priority: job.priority,
          meta: job.meta,
        },
      );
    }
  }

  private async handleEnrichmentJob(job: IngestionJob) {
    const feedItem = await prisma.socialFeedItem.findFirst({
      where: {
        externalUrl: { contains: job.targetId },
      },
    });

    if (feedItem) {
      logger.info(`[IngestionWorker] Running AI Enrichment for ${feedItem.id}`);

      // Mocked AI analysis
      await prisma.socialFeedSignal.createMany({
        data: [
          {
            socialFeedId: feedItem.id,
            type: "SENTIMENT",
            value: "POSITIVE",
            confidence: 0.92,
          },
          {
            socialFeedId: feedItem.id,
            type: "MOOD",
            value: "ENERGETIC",
            confidence: 0.85,
          },
        ],
      });

      logger.info(
        `[IngestionWorker] AI Enrichment complete for ${feedItem.id}`,
      );
    }
  }

  private async handleStatsJob(job: IngestionJob) {
    const connector = IngestionManager.getConnector(job.platform);
    const details = await connector.getContentDetails(job.targetId);

    if (details && details.stats) {
      const feedItem = await prisma.socialFeedItem.findUnique({
        where: { externalUrl: details.url },
      });

      if (feedItem) {
        await prisma.$transaction([
          // 1. Update current stats directly on the item
          prisma.socialFeedItem.update({
            where: { id: feedItem.id },
            data: {
              views: details.stats.views || 0,
              likes: details.stats.likes || 0,
              comments: details.stats.comments || 0,
            },
          }),
          // 2. Take historical snapshot
          prisma.socialFeedSnapshot.create({
            data: {
              socialFeedId: feedItem.id,
              views: details.stats.views || 0,
              likes: details.stats.likes || 0,
              comments: details.stats.comments || 0,
              bookmarks: feedItem.bookmarks || 0, // Carry over current bookmarks
            },
          }),
        ]);
        logger.info(
          `[IngestionWorker] Stats and snapshot updated for ${details.platform}:${details.id}`,
        );
      }
    }
  }

  private async handleSearchJob(job: IngestionJob) {
    const connector = IngestionManager.getConnector(job.platform);
    logger.info(
      `[IngestionWorker] Performing ${job.platform} search scout for keyword: "${job.targetId}"`,
    );

    // In search jobs, targetId is the keyword
    const items = await connector.searchContent(job.targetId);

    logger.info(
      `[IngestionWorker] Search found ${items.length} candidates for keyword: "${job.targetId}"`,
    );

    for (const item of items) {
      // For talent scouting, we want to monitor the CHANNEL, not just the video
      const channelId = item.author?.id;
      const channelName = item.author?.name;
      if (!channelId || !channelName) continue;

      // 1. Create / Find a Draft Artist for this talent
      const artist = await prisma.chummeArtist.upsert({
        where: { name: channelName },
        update: {}, // Don't overwrite if manual adjustments were made
        create: {
          name: channelName,
          imageUrl: item.author?.avatarUrl,
          isDraft: true,
          discoveredAt: new Date(),
          // Link to the primary category that triggered the discovery
          ...(job.meta?.categoryId && {
            chummeCategories: {
              connect: { id: job.meta.categoryId },
            },
          }),
        },
      });

      // 2. Register the Ingestion Target and link to the Draft Artist
      await prisma.socialIngestionTarget.upsert({
        where: {
          platform_externalHandle: {
            platform: item.platform,
            externalHandle: channelId,
          },
        },
        update: {
          chummeArtistId: artist.id, // Ensure target is linked to the draft artist
        },
        create: {
          platform: item.platform,
          externalHandle: channelId,
          chummeArtistId: artist.id,
          chummeCategoryId: job.meta?.categoryId,
          chummeSubCategoryId: job.meta?.subCategoryId,
          chummeTopicCategoryId: job.meta?.topicCategoryId,
          isActive: true, // Auto-start crawling discovered talent
          crawlIntervalHours: 48, // New talent crawled less frequently initially
          crawlPriority: 1,
        },
      });
    }
  }
}
