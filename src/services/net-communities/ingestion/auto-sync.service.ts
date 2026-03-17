import { SocialPlatform } from "@prisma/client";
import { prisma } from "../../../utils/prisma";
import { IngestionManager } from "../connectors/platform.service";
import { rabbitMQService } from "../../../utils/rabbitmq";
import {
  IngestionJobType,
  IngestionJob,
} from "../../../listeners/ingestion.listener";
import logger from "../../../utils/logger";

export class AutoSyncSvc {
  /**
   * Attempt to discover and sync a user's social profile immediately after linking
   */
  static async syncLinkedAccount(
    userId: string,
    platform: SocialPlatform,
    accessToken: string,
  ) {
    try {
      logger.info(
        `[AutoSyncSvc] Attempting auto-sync for user ${userId} on ${platform}`,
      );

      const connector = IngestionManager.getConnector(platform);
      const profileId = await connector.discoverMyProfile(accessToken);

      if (!profileId) {
        logger.info(
          `[AutoSyncSvc] No primary profile discovered for user ${userId} on ${platform}`,
        );
        return;
      }

      logger.info(
        `[AutoSyncSvc] Discovered profile ID: ${profileId}. Creating ingestion target...`,
      );

      // 1. Create Ingestion Target for this user
      const target = await prisma.socialIngestionTarget.upsert({
        where: {
          platform_externalHandle: {
            platform,
            externalHandle: profileId,
          },
        },
        update: {
          isActive: true,
          // If we want to link it specifically to this user's stats
          // We might need a common field or just use handle-based mapping
        },
        create: {
          platform,
          externalHandle: profileId,
          crawlIntervalHours: 24,
          crawlPriority: 2, // User-linked accounts get higher priority than random scouts
          isActive: true,
        },
      });

      // 2. Trigger immediate ingestion jobs (Metadata & Discovery)
      const discoveryJob: IngestionJob = {
        type: IngestionJobType.DISCOVERY,
        platform,
        targetId: profileId,
        priority: 2,
        meta: { userId },
      };

      await rabbitMQService.publishMessage(
        `ingestion.${IngestionJobType.DISCOVERY}`,
        discoveryJob,
        {
          priority: 2,
        },
      );

      logger.info(
        `[AutoSyncSvc] Immediate discovery job queued for ${profileId}`,
      );
    } catch (error) {
      logger.error(
        `[AutoSyncSvc] Error during auto-sync for user ${userId}:`,
        error,
      );
    }
  }
}
