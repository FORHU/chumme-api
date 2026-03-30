import { SocialPlatform } from "@prisma/client";
import {
  PlatformConnector,
  GenericContentItem,
  IngestionManager,
} from "./platform.service";
import logger from "../../../utils/logger";

/**
 * Instagram realization of the PlatformConnector.
 * Currently implemented as a shell/placeholder.
 */
export class InstagramConnector implements PlatformConnector {
  platform: SocialPlatform = SocialPlatform.INSTAGRAM;

  async getContentDetails(
    contentId: string,
  ): Promise<GenericContentItem | null> {
    logger.info(
      `[InstagramConnector] [PLACEHOLDER] Fetching details for content: ${contentId}. Awaiting integration.`,
    );
    return null;
  }

  async getChannelContent(
    handle: string,
    _limit: number = 20,
    _pageToken?: string,
  ): Promise<{ items: GenericContentItem[]; nextPageToken?: string }> {
    logger.info(
      `[InstagramConnector] [PLACEHOLDER] Fetching content for user handle: ${handle}. Awaiting integration.`,
    );
    return { items: [] };
  }

  async searchContent(
    _query: string,
    _limit: number = 10,
    _regionCode?: string,
  ): Promise<GenericContentItem[]> {
    return [];
  }

  async getChannelMetadata(_channelId: string): Promise<any> {
    return null;
  }

  async discoverMyProfile(_accessToken: string): Promise<string | null> {
    return null; // Placeholder for now
  }
}

// Register the connector
IngestionManager.registerConnector(new InstagramConnector());
