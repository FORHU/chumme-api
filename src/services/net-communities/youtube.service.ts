import { google, youtube_v3 } from "googleapis";
import { GaxiosResponse } from "gaxios";

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
        id: [videoId],
      });

      const video = response.data.items?.[0];
      return video || null;
    } catch (error) {
      console.error("Error fetching YouTube video details:", error);
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

      return response.data.items || [];
    } catch (error) {
      console.error("Error searching YouTube videos:", error);
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

      return response.data.items?.[0] || null;
    } catch (error) {
      console.error("Error fetching YouTube channel:", error);
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

      return {
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.pageInfo?.totalResults,
      };
    } catch (error) {
      console.error("Error fetching YouTube playlist items:", error);
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

      return response.data.items?.[0] || null;
    } catch (error) {
      console.error("Error fetching YouTube 'mine' channel:", error);
      return null;
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

      return response.data.items || [];
    } catch (error) {
      console.error("Error fetching YouTube comment threads:", error);
      throw error;
    }
  }
}
