import { SocialPlatform } from "@prisma/client";

/**
 * Generic content item representing a post or video from any platform
 */
export interface GenericContentItem {
  id: string; // Original platform ID
  platform: SocialPlatform;
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  crawledAt: Date;
  isLive?: boolean;
  publishedAt?: Date;
  author: {
    id: string;
    name: string;
    handle?: string;
    avatarUrl?: string;
  };
  stats: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  metaData: any; // Raw platform-specific data
}

/**
 * Generic comment item from any platform for read-only display
 */
export interface GenericCommentItem {
  id: string; // Original platform ID
  content: string;
  authorName?: string;
  authorAvatarUrl?: string;
  authorHandle?: string;
  publishedAt?: Date;
}

/**
 * Interface that every social media platform connector must implement
 */
export interface PlatformConnector {
  platform: SocialPlatform;

  /**
   * Fetch details for a specific piece of content
   */
  getContentDetails(contentId: string): Promise<GenericContentItem | null>;

  /**
   * Fetch recent content from a channel/account
   */
  getChannelContent(
    channelId: string,
    limit?: number,
    pageToken?: string,
  ): Promise<{ items: GenericContentItem[]; nextPageToken?: string }>;

  /**
   * Search for content based on a query
   */
  searchContent(
    query: string,
    limit?: number,
    regionCode?: string,
  ): Promise<GenericContentItem[]>;

  /**
   * Fetch channel/account metadata
   */
  getChannelMetadata(channelId: string): Promise<any>;

  /**
   * Fetch multiple channels/accounts metadata (Batch)
   */
  getChannelsMetadata?(channelIds: string[]): Promise<any[]>;

  /**
   * Discover the primary profile ID (e.g. channelId) for an authenticated user
   */
  discoverMyProfile(accessToken: string): Promise<string | null>;

  /**
   * Fetch comments for a piece of content (Optional)
   */
  getComments?(contentId: string): Promise<GenericCommentItem[]>;

  /**
   * Fetch current live status of a channel/account (Optional)
   */
  getChannelLiveStatus?(channelId: string): Promise<boolean>;
}

/**
 * Manager to handle multiple platform connectors
 */
export class IngestionManager {
  private static connectors: Map<SocialPlatform, PlatformConnector> = new Map();

  static registerConnector(connector: PlatformConnector) {
    this.connectors.set(connector.platform, connector);
  }

  static getConnector(platform: SocialPlatform): PlatformConnector {
    const connector = this.connectors.get(platform);
    if (!connector) {
      throw new Error(`No connector registered for platform: ${platform}`);
    }
    return connector;
  }
}
