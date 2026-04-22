import amqp from "amqplib";
import { INGESTION_QUEUE_NAME } from "../config";
import { MessageHandler, rabbitMQService } from "../utils/rabbitmq";
import logger from "../utils/logger";
import { SocialPlatform } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { IngestionManager } from "../services/net-communities/connectors/platform.service";
import SocialFeedSvc from "../services/social-feed.service";
import RedisUtil from "../utils/redis.util";
// import SocialUserDiscoverySvc from "../services/social-user-discovery.service";

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

export enum IngestionMode {
  SYNC = "sync", // Get latest uploads, stop on duplicate
  BACKFILL = "backfill", // Get historical uploads using token
}

export interface IngestionJob {
  type: IngestionJobType;
  platform: SocialPlatform;
  targetId: string; // channelId or contentId
  priority: number;
  meta?: any;
}

export class IngestionWorker {
  private readonly queueName = INGESTION_QUEUE_NAME;
  private readonly routingKeys = ["ingestion.*"];

  async start(): Promise<void> {
    logger.info("[IngestionWorker] Starting... [v2: isLive restored]");
    await rabbitMQService.subscribeToMessages(
      this.queueName,
      this.routingKeys,
      this.handleMessage.bind(this),
    );
    logger.info(
      `[IngestionWorker] Subscribed to ingestion queue: ${this.queueName}`,
    );
  }

  private handleMessage: MessageHandler = async (
    message: IngestionJob,
    _originalMsg: amqp.ConsumeMessage,
  ) => {
    logger.info(
      `[IngestionWorker] Processing ${message.type} job for ${message.platform}:${message.targetId}`,
    );

    try {
      // 1. Deduplication check
      const dedupKey =
        message.type === IngestionJobType.DISCOVERY
          ? `${message.platform}:${message.targetId}:${message.meta?.pageToken || "first"}`
          : `${message.platform}:${message.targetId}`;
      const shouldBypassDedup = Boolean(message.meta?.force);
      if (
        !shouldBypassDedup &&
        (await RedisUtil.isDuplicate(message.type, dedupKey))
      ) {
        logger.info(
          `[IngestionWorker] Skipping duplicate job: ${message.type} for ${dedupKey}`,
        );
        return;
      }

      // 2. Rate limiting check (Bumbed to 500 requests per 60s for burst testing)
      if (await RedisUtil.isRateLimited(message.platform, 500, 60)) {
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
        const { workerMetrics } = await import("../utils/worker-metrics");
        workerMetrics.recordJob({
          jobId: `${message.platform}:${message.targetId}`,
          jobType: `ingestion:${message.type}`,
          durationMs,
          status,
        });
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
    const maxItems =
      typeof job.meta?.maxItems === "number" ? job.meta.maxItems : undefined;
    const processedCount =
      job.meta && typeof job.meta.processedCount === "number"
        ? job.meta.processedCount
        : 0;
    const mode = job.meta?.mode || IngestionMode.SYNC;
    const isBackfill = mode === IngestionMode.BACKFILL;

    const remainingItems =
      typeof maxItems === "number"
        ? Math.max(maxItems - processedCount, 0)
        : undefined;

    if (remainingItems === 0) {
      logger.info(
        `[IngestionWorker] Reached maxItems=${maxItems} for ${job.platform}:${job.targetId}`,
      );
      return;
    }

    let result;
    try {
      const pageToken = isBackfill
        ? job.meta?.backfillToken
        : job.meta?.pageToken;

      result = await connector.getChannelContent(
        job.targetId,
        remainingItems ? Math.min(20, remainingItems) : 20,
        pageToken,
      );
    } catch (error: any) {
      const isQuotaError =
        error.message?.includes("quotaExceeded") ||
        error.code === 403 ||
        error.status === 403;
      if (isQuotaError) {
        logger.warn(
          `[IngestionWorker] ${job.platform} Quota/Forbidden error for ${job.targetId}. Applying 6h cooldown.`,
        );
        const updateData: any = {
          quotaLimitHitAt: new Date(),
        };

        if (isBackfill) {
          updateData.backfillToken = job.meta?.backfillToken || null;
        } else {
          updateData.nextPageToken = job.meta?.pageToken || null;
        }

        await prisma.socialIngestionTarget.updateMany({
          where: { platform: job.platform, externalHandle: job.targetId },
          data: updateData,
        });
        return; // Graceful stop
      }
      throw error;
    }

    const items =
      typeof remainingItems === "number"
        ? result.items.slice(0, remainingItems)
        : result.items;
    const nextPageToken = result.nextPageToken;

    logger.info(
      `[IngestionWorker] Discovered ${items.length} items for ${job.platform}:${job.targetId} (Mode: ${mode})`,
    );

    // Sync Artist Stats during discovery if linked
    if (job.meta?.artistId && job.platform === SocialPlatform.YOUTUBE) {
      try {
        const meta = await connector.getChannelMetadata(job.targetId);
        if (meta) {
          const stats = meta.statistics;
          const isLive = await connector.getChannelLiveStatus!(job.targetId);

          await prisma.chummeArtist.update({
            where: { id: job.meta.artistId },
            data: {
              isLive,
              subscriberCount: parseInt(stats?.subscriberCount || "0"),
              totalViews: BigInt(stats?.viewCount || "0"),
              lastLiveAt: isLive ? new Date() : undefined,
            },
          });
          logger.info(
            `[IngestionWorker] Updated artist stats for ${job.meta.artistId} during discovery`,
          );
        }
      } catch (err) {
        logger.warn(
          `[IngestionWorker] Failed to sync artist stats during discovery: ${err}`,
        );
      }
    }

    let newOrUpdatedCount = 0;
    for (const item of items) {
      // 1. Initial upsert to register the content
      const { isUpdate } = await SocialFeedSvc.upsertExternalMedia({
        externalUrl: item.url,
        title: item.title || "Social Media Content",
        socialPlatform: item.platform,
        metaData: item.metaData,
        isLive: item.isLive,
        chummeArtistId: job.meta?.artistId,
        chummeTopicCategoryId: job.meta?.topicCategoryId,
      } as any);

      if (!isUpdate) newOrUpdatedCount++;

      // Stop SYNC crawling if we hit a video we already have (and not forced)
      if (
        mode === IngestionMode.SYNC &&
        isUpdate &&
        !job.meta?.force &&
        item.platform !== SocialPlatform.TIKTOK // TikTok often returns unstable results, avoid stopping too early
      ) {
        logger.info(
          `[IngestionWorker] SYNC hit existing item ${item.id}. Stopping discovery for ${job.targetId}`,
        );
        return;
      }

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

    const nextProcessedCount = processedCount + items.length;

    logger.info(
      `[IngestionWorker] DISCOVERY SUCCESS: ${items.length} items processed (${newOrUpdatedCount} new/updated) for ${job.platform}:${job.targetId}. Total so far: ${nextProcessedCount}`,
    );

    // Recursive pagination loop
    if (
      nextPageToken &&
      (typeof maxItems !== "number" || nextProcessedCount < maxItems) &&
      (isBackfill || job.meta?.force) // Sync mode generally shouldn't paginate unless forced
    ) {
      // Save progress to DB for backfill
      if (isBackfill) {
        await prisma.socialIngestionTarget.updateMany({
          where: { platform: job.platform, externalHandle: job.targetId },
          data: { backfillToken: nextPageToken },
        });
      }

      logger.info(
        `[IngestionWorker] Triggering next page ${mode} for ${job.targetId}`,
      );
      const routingKey = `ingestion.${IngestionJobType.DISCOVERY}`;
      await rabbitMQService.publishMessage(routingKey, {
        ...job,
        meta: {
          ...job.meta,
          [isBackfill ? "backfillToken" : "pageToken"]: nextPageToken,
          processedCount: nextProcessedCount,
        },
      });
    } else if (isBackfill && !nextPageToken) {
      // Backfill complete!
      logger.info(
        `[IngestionWorker] BACKFILL COMPLETED for ${job.platform}:${job.targetId}`,
      );
      await prisma.socialIngestionTarget.updateMany({
        where: { platform: job.platform, externalHandle: job.targetId },
        data: {
          isHistoryCaughtUp: true,
          backfillToken: null,
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
        chummeTopicCategoryId: job.meta?.topicCategoryId,
        views: details.stats?.views,
        likes: details.stats?.likes,
        comments: details.stats?.comments,
      } as any);
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

      logger.info(
        `[IngestionWorker] METADATA SUCCESS: ${details.platform}:${details.id} updated and AI Enrichment queued.`,
      );
    } else {
      logger.warn(
        `[IngestionWorker] METADATA FAILURE: No details found for ${job.platform}:${job.targetId}`,
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
          chummeTopicCategoryId: job.meta?.topicCategoryId,
          isActive: true, // Auto-start crawling discovered talent
          crawlIntervalHours: 48, // New talent crawled less frequently initially
          crawlPriority: 1,
        },
      });
    }
  }
}
