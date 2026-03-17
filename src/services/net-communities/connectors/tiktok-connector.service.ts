import { SocialPlatform } from "@prisma/client";
import {
  PlatformConnector,
  GenericContentItem,
  IngestionManager,
} from "./platform.service";
import logger from "../../../utils/logger";

/**
 * TikTok realization of the PlatformConnector.
 * Currently implemented as a shell/placeholder for 3rd party API integration
 */
export class TikTokConnector implements PlatformConnector {
  platform: SocialPlatform = SocialPlatform.TIKTOK;

  async getContentDetails(
    contentId: string,
  ): Promise<GenericContentItem | null> {
    logger.info(
      `[TikTokConnector] [PLACEHOLDER] Fetching details for content: ${contentId}. Awaiting integration.`,
    );
    return null;
  }

  async getChannelContent(
    handle: string,
    limit: number = 20,
    pageToken?: string,
  ): Promise<{ items: GenericContentItem[]; nextPageToken?: string }> {
    logger.info(
      `[TikTokConnector] [PLACEHOLDER] Fetching content for user handle: ${handle}. Awaiting integration.`,
    );
    return { items: [] };
  }

  async searchContent(
    query: string,
    limit: number = 10,
    regionCode?: string,
  ): Promise<GenericContentItem[]> {
    return [];
  }

  async getChannelMetadata(channelId: string): Promise<any> {
    return null;
  }

  async discoverMyProfile(accessToken: string): Promise<string | null> {
    return null; // Placeholder for now
  }
}

// Register the connector
IngestionManager.registerConnector(new TikTokConnector());
