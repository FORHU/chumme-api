import { google, youtube_v3 } from "googleapis";
import { QuotaService } from "./ingestion/quota.service";
import logger from "../../utils/logger";

/** Recent uploads inspected per channel when looking for a live broadcast. */
const LIVE_CANDIDATES_PER_CHANNEL = 5;

/**
 * A channel's uploads playlist id is its channel id with the "UC" prefix
 * swapped for "UU" — a stable YouTube convention that saves a channels.list
 * call per channel. Returns null for anything that is not a UC… id.
 */
export function uploadsPlaylistFor(channelId: string): string | null {
  return /^UC[\w-]{22}$/.test(channelId) ? `UU${channelId.slice(2)}` : null;
}

export default class YouTubeService {
  private static youtube: youtube_v3.Youtube;

  private static getYouTubeClient() {
    if (!this.youtube) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "YOUTUBE_API_KEY is not defined in environment variables",
        );
      }
      this.youtube = google.youtube({
        version: "v3",
        auth: apiKey,
      });
    }
    return this.youtube;
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url: string): string | null {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  }

  /**
   * Fetch video details from YouTube Data API
   */
  static async getVideoDetails(
    videoId: string,
  ): Promise<youtube_v3.Schema$Video | null> {
    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.videos.list({
        part: ["snippet", "contentDetails", "statistics"],
        id: [videoId.toString()], // Ensure it's a string, though videos.list usually takes one at a time here
      });
      await QuotaService.increment(1);

      const video = response.data.items?.[0];
      return video || null;
    } catch (error) {
      logger.error("Error fetching YouTube video details:", error);
      throw error;
    }
  }

  /**
   * Search for videos on YouTube
   */
  static async searchVideos(
    query: string,
    maxResults: number = 5,
    regionCode?: string,
  ): Promise<youtube_v3.Schema$SearchResult[]> {
    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        maxResults,
        regionCode,
      });
      await QuotaService.increment(100);

      return response.data.items || [];
    } catch (error) {
      logger.error("Error searching YouTube videos:", error);
      throw error;
    }
  }

  /**
   * Get channel details by ID or Username (handle)
   */
  static async getChannel(params: {
    channelId?: string;
    handle?: string;
  }): Promise<youtube_v3.Schema$Channel | null> {
    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.channels.list({
        part: ["snippet", "contentDetails", "statistics", "brandingSettings"],
        id: params.channelId ? [params.channelId] : undefined,
        forHandle: params.handle,
      });
      await QuotaService.increment(1);

      return response.data.items?.[0] || null;
    } catch (error) {
      logger.error("Error fetching YouTube channel:", error);
      throw error;
    }
  }

  /**
   * Get multiple channel details by IDs (Batch)
   */
  static async getChannels(
    channelIds: string[],
  ): Promise<youtube_v3.Schema$Channel[]> {
    if (!channelIds || channelIds.length === 0) return [];

    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.channels.list({
        part: ["snippet", "statistics"],
        id: [channelIds.join(",")],
      });
      // await QuotaService.increment(1); // 1 request = 1 unit

      return response.data.items || [];
    } catch (error) {
      logger.error("Error fetching YouTube channels batch:", error);
      throw error;
    }
  }

  /**
   * Get videos from a specific playlist
   */
  static async getPlaylistVideos(
    playlistId: string,
    maxResults: number = 20,
    pageToken?: string,
  ) {
    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId,
        maxResults,
        pageToken,
      });
      await QuotaService.increment(1);

      return {
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.pageInfo?.totalResults,
      };
    } catch (error) {
      logger.error("Error fetching YouTube playlist items:", error);
      throw error;
    }
  }

  /**
   * Get the primary channel of the authenticated user
   */
  static async getMyChannel(
    accessToken: string,
  ): Promise<youtube_v3.Schema$Channel | null> {
    // Note: To use OAuth token, we need a separate client instance or use the auth field
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    try {
      const response = await youtube.channels.list({
        part: ["snippet", "contentDetails", "statistics", "brandingSettings"],
        mine: true,
      });
      await QuotaService.increment(1);

      return response.data.items?.[0] || null;
    } catch (error) {
      logger.error("Error fetching YouTube 'mine' channel:", error);
      return null;
    }
  }

  /**
   * Get the latest upload from a channel to check live status
   */
  static async getLatestChannelUpload(
    channelId: string,
  ): Promise<youtube_v3.Schema$PlaylistItem | null> {
    const youtube = this.getYouTubeClient();

    try {
      // Derive uploads playlist ID (Replace 'UC' with 'UU')
      const uploadsPlaylistId = channelId.replace(/^UC/, "UU");

      const response = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: uploadsPlaylistId,
        maxResults: 1,
      });
      await QuotaService.increment(1);

      return response.data.items?.[0] || null;
    } catch (error) {
      logger.error(
        `Error fetching latest upload for channel ${channelId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if specific channels are currently live and get their video IDs
   */
  static async checkLiveStatus(
    channelIds: string[],
  ): Promise<
    Map<
      string,
      { videoId: string; concurrentViewers?: number; actualStartTime?: string }
    >
  > {
    const youtube = this.getYouTubeClient();
    const liveMap = new Map<
      string,
      { videoId: string; concurrentViewers?: number; actualStartTime?: string }
    >();

    if (!channelIds || channelIds.length === 0) return liveMap;

    const videoIdToChannelId = new Map<string, string>();
    try {
      // 1. CANDIDATES (Cost: 1 unit per channel). A broadcast that is live
      // right now sits at the top of the channel's uploads playlist, so the
      // last few uploads are enough to find it. This replaced
      // `search.list({ eventType: "live" })`, which costs 100 units per channel
      // and burned the project's 100-searches-a-day search quota within
      // minutes of a deploy.
      for (const channelId of channelIds) {
        const uploadsPlaylistId = uploadsPlaylistFor(channelId);
        if (!uploadsPlaylistId) continue;

        try {
          const uploads = await youtube.playlistItems.list({
            part: ["contentDetails"],
            playlistId: uploadsPlaylistId,
            maxResults: LIVE_CANDIDATES_PER_CHANNEL,
          });
          await QuotaService.increment(1);

          for (const item of uploads.data.items || []) {
            const videoId = item.contentDetails?.videoId;
            if (videoId) videoIdToChannelId.set(videoId, channelId);
          }
        } catch (error: any) {
          // One deleted or private channel must not end the whole sweep.
          logger.warn(
            `[YouTubeService] Uploads unavailable for channel ${channelId}: ${error?.message ?? error}`,
          );
        }
      }

      if (videoIdToChannelId.size === 0) return liveMap;

      // 2. LIVE + EMBEDDABILITY GATE (Cost: 1 unit per 50 videos): keep only
      // videos that are live now, and drop non-embeddable ones (e.g. FOX, BBC,
      // sports streams that block third-party embeds). Without the embeddable
      // check we hand the mobile player a videoId YouTube's iframe will reject
      // with "This live stream recording is not available."
      const candidateIds = Array.from(videoIdToChannelId.keys());
      const items: any[] = [];
      for (let i = 0; i < candidateIds.length; i += 50) {
        const videosResponse = await youtube.videos.list({
          part: ["snippet", "status", "liveStreamingDetails"],
          id: candidateIds.slice(i, i + 50),
        });
        await QuotaService.increment(1);
        items.push(...(videosResponse.data.items || []));
      }

      for (const item of items) {
        const vid = item.id;
        if (!vid) continue;
        const channelId = videoIdToChannelId.get(vid);
        if (!channelId || liveMap.has(channelId)) continue;

        const status = item.status as any;
        const liveDetails = item.liveStreamingDetails as any;
        const isLiveNow =
          item.snippet?.liveBroadcastContent === "live" &&
          !!liveDetails?.actualStartTime;
        if (!isLiveNow) continue;

        const isEmbeddable = status?.embeddable !== false;
        const isOngoing = !liveDetails?.actualEndTime;

        if (isEmbeddable && isOngoing) {
          liveMap.set(channelId, {
            videoId: vid,
            concurrentViewers: parseInt(
              liveDetails?.concurrentViewers || "0",
              10,
            ),
            actualStartTime: liveDetails?.actualStartTime,
          });
        } else {
          logger.debug(
            `[YouTubeService] Dropping ${vid} for channel ${channelId}: ` +
              `embeddable=${isEmbeddable} ongoing=${isOngoing}`,
          );
        }
      }

      return liveMap;
    } catch (error) {
      logger.error("Error checking YouTube live status:", error);
      return liveMap;
    }
  }

  /**
   * Get comment threads for a video
   */
  static async getCommentThreads(
    videoId: string,
    maxResults: number = 20,
  ): Promise<youtube_v3.Schema$CommentThread[]> {
    const youtube = this.getYouTubeClient();

    try {
      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId: videoId,
        maxResults,
        order: "relevance", // Get top comments
      });
      await QuotaService.increment(1);

      return response.data.items || [];
    } catch (error) {
      logger.error("Error fetching YouTube comment threads:", error);
      throw error;
    }
  }
}
