import { SocialPlatform } from "@prisma/client";
import {
  PlatformConnector,
  GenericContentItem,
  GenericCommentItem,
  IngestionManager,
} from "./platform.service";
import YouTubeService from "../youtube.service";

export class YouTubeConnector implements PlatformConnector {
  platform: SocialPlatform = SocialPlatform.YOUTUBE;

  async getContentDetails(
    contentId: string,
  ): Promise<GenericContentItem | null> {
    const video = await YouTubeService.getVideoDetails(contentId);
    if (!video) return null;

    return this.mapToGenericItem(video);
  }

  async getChannelContent(
    channelId: string,
    limit: number = 20,
    pageToken?: string,
  ): Promise<{ items: GenericContentItem[]; nextPageToken?: string }> {
    const channel = await YouTubeService.getChannel({ channelId });
    if (!channel) return { items: [] };

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return { items: [] };

    const result = await YouTubeService.getPlaylistVideos(
      uploadsPlaylistId,
      limit,
      pageToken,
    );
    return {
      items: result.items.map((item) =>
        this.mapPlaylistVideoToGenericItem(item),
      ),
      nextPageToken: result.nextPageToken ?? undefined,
    };
  }

  async searchContent(
    query: string,
    limit: number = 10,
    regionCode?: string,
  ): Promise<GenericContentItem[]> {
    const results = await YouTubeService.searchVideos(query, limit, regionCode);
    // Search results are snippets only, might need full details for stats
    return results.map((item) => this.mapSearchToGenericItem(item));
  }

  async getChannelMetadata(channelId: string): Promise<any> {
    return YouTubeService.getChannel({ channelId });
  }

  async discoverMyProfile(accessToken: string): Promise<string | null> {
    const channel = await YouTubeService.getMyChannel(accessToken);
    return channel?.id || null;
  }

  private mapToGenericItem(video: any): GenericContentItem {
    return {
      id: video.id,
      platform: this.platform,
      title: video.snippet?.title,
      description: video.snippet?.description,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl:
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.default?.url,
      crawledAt: new Date(),
      publishedAt: video.snippet?.publishedAt
        ? new Date(video.snippet.publishedAt)
        : undefined,
      author: {
        id: video.snippet?.channelId,
        name: video.snippet?.channelTitle,
      },
      stats: {
        views: parseInt(video.statistics?.viewCount || "0"),
        likes: parseInt(video.statistics?.likeCount || "0"),
        comments: parseInt(video.statistics?.commentCount || "0"),
      },
      metaData: video,
    };
  }

  private mapPlaylistVideoToGenericItem(item: any): GenericContentItem {
    const videoId = item.contentDetails?.videoId;
    return {
      id: videoId,
      platform: this.platform,
      title: item.snippet?.title,
      description: item.snippet?.description,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url,
      crawledAt: new Date(),
      publishedAt: item.snippet?.publishedAt
        ? new Date(item.snippet.publishedAt)
        : undefined,
      author: {
        id: item.snippet?.channelId,
        name: item.snippet?.channelTitle,
      },
      stats: {}, // Playlist items don't include stats, need a separate job later
      metaData: item,
    };
  }

  private mapSearchToGenericItem(item: any): GenericContentItem {
    const videoId = item.id?.videoId;
    return {
      id: videoId,
      platform: this.platform,
      title: item.snippet?.title,
      description: item.snippet?.description,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url,
      crawledAt: new Date(),
      publishedAt: item.snippet?.publishedAt
        ? new Date(item.snippet.publishedAt)
        : undefined,
      author: {
        id: item.snippet?.channelId,
        name: item.snippet?.channelTitle,
      },
      stats: {},
      metaData: item,
    };
  }

  async getComments(contentId: string): Promise<GenericCommentItem[]> {
    const rawComments = await YouTubeService.getCommentThreads(contentId);
    return rawComments.map((item) => this.mapCommentToGenericItem(item));
  }

  private mapCommentToGenericItem(item: any): GenericCommentItem {
    const snippet = item.snippet?.topLevelComment?.snippet;
    return {
      id: item.id,
      content: snippet?.textDisplay || "",
      authorName: snippet?.authorDisplayName,
      authorAvatarUrl: snippet?.authorProfileImageUrl,
      authorHandle:
        snippet?.authorChannelId?.value || snippet?.authorChannelUrl,
      publishedAt: snippet?.publishedAt
        ? new Date(snippet.publishedAt)
        : undefined,
    };
  }
}

// Register the connector
IngestionManager.registerConnector(new YouTubeConnector());
