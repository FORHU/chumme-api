import { Request, Response } from "express";
import YouTubeService from "../../services/net-communities/youtube.service";
import SocialFeedSvc from "../../services/social-feed.service";

import FileRepo from "../../repositories/file.repository";

export default class YouTubeCtrl {
  /**
   * Get metadata for a YouTube video via URL or ID
   */
  static async getVideoDetails(req: Request, res: Response) {
    try {
      const { url, videoId: queryVideoId, id } = req.query;
      console.log("[YouTubeCtrl.getVideoDetails] Input:", {
        url,
        queryVideoId,
        id,
      });

      let videoId = (queryVideoId || id) as string;

      if (url && !videoId) {
        videoId = YouTubeService.extractVideoId(url as string) || "";
      }

      console.log("[YouTubeCtrl.getVideoDetails] Extracted videoId:", videoId);

      if (!videoId) {
        return res.status(400).json({
          message: "A valid YouTube URL or videoId is required",
          received: { url, videoId: queryVideoId, id },
        });
      }

      const details = await YouTubeService.getVideoDetails(videoId);

      if (!details) {
        return res.status(404).json({ message: "Video not found" });
      }

      return res.json({
        message: "YouTube video details fetched successfully",
        data: details,
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.getVideoDetails Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Search for YouTube videos
   */
  static async searchVideos(req: Request, res: Response) {
    try {
      const { q, maxResults } = req.query;

      if (!q) {
        return res
          .status(400)
          .json({ message: "Search query 'q' is required" });
      }

      const results = await YouTubeService.searchVideos(
        q as string,
        maxResults ? parseInt(maxResults as string) : 5,
      );

      return res.json({
        message: "YouTube search results fetched successfully",
        data: results,
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.searchVideos Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Get videos from a channel (uploads playlist)
   */
  static async getChannelVideos(req: Request, res: Response) {
    try {
      const { handle, channelId, maxResults, pageToken } = req.query;

      if (!handle && !channelId) {
        return res
          .status(400)
          .json({ message: "Either 'handle' or 'channelId' is required" });
      }

      // 1. Get channel info to find the uploads playlist ID
      const channel = await YouTubeService.getChannel({
        handle: handle as string,
        channelId: channelId as string,
      });

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const uploadsPlaylistId =
        channel.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return res.status(404).json({
          message: "Could not find uploads playlist for this channel",
        });
      }

      // 2. Fetch videos from the uploads playlist
      const results = await YouTubeService.getPlaylistVideos(
        uploadsPlaylistId,
        maxResults ? parseInt(maxResults as string) : 20,
        pageToken as string,
      );

      return res.json({
        message: "Channel videos fetched successfully",
        data: {
          channel: {
            id: channel.id,
            title: channel.snippet?.title,
            description: channel.snippet?.description,
            thumbnails: channel.snippet?.thumbnails,
          },
          ...results,
        },
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.getChannelVideos Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Get videos from a specific playlist
   */
  static async getPlaylistVideos(req: Request, res: Response) {
    try {
      const { playlistId, maxResults, pageToken } = req.query;

      if (!playlistId) {
        return res.status(400).json({ message: "playlistId is required" });
      }

      const results = await YouTubeService.getPlaylistVideos(
        playlistId as string,
        maxResults ? parseInt(maxResults as string) : 20,
        pageToken as string,
      );

      return res.json({
        message: "Playlist videos fetched successfully",
        data: results,
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.getPlaylistVideos Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Import videos from a playlist into the database
   */
  static async importPlaylistVideos(req: Request, res: Response) {
    try {
      const { playlistId, maxResults, artistId } = req.body;

      if (!playlistId) {
        return res
          .status(400)
          .json({ message: "playlistId is required in request body" });
      }

      const results = await YouTubeService.getPlaylistVideos(
        playlistId as string,
        maxResults ? parseInt(maxResults as string) : 10,
      );

      const imported = [];
      for (const item of results.items) {
        const videoId = item.contentDetails?.videoId;
        const title = item.snippet?.title || "YouTube Video";
        const externalUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnail =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.default?.url;

        if (!videoId) continue;

        const result = await SocialFeedSvc.upsertExternalMedia({
          externalUrl,
          title,
          socialPlatform: "YOUTUBE",
          chummeArtistId: artistId,
          metaData: {
            youtubeId: videoId,
            snippet: item.snippet,
            contentDetails: item.contentDetails,
          },
        });

        imported.push({
          videoId,
          title,
          status: result.isUpdate ? "updated" : "created",
        });
      }

      return res.json({
        message: `Imported ${imported.length} videos from playlist`,
        data: imported,
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.importPlaylistVideos Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Import latest videos from a channel into the database
   */
  static async importChannelVideos(req: Request, res: Response) {
    try {
      const { handle, channelId, maxResults, artistId } = req.body;

      if (!handle && !channelId) {
        return res.status(400).json({
          message: "Either 'handle' or 'channelId' is required in request body",
        });
      }

      const channel = await YouTubeService.getChannel({
        handle: handle as string,
        channelId: channelId as string,
      });

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const uploadsPlaylistId =
        channel.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return res.status(404).json({
          message: "Could not find uploads playlist for this channel",
        });
      }

      // Re-use logic for playlist import
      req.body.playlistId = uploadsPlaylistId;
      return await this.importPlaylistVideos(req, res);
    } catch (error: any) {
      console.error("YouTubeCtrl.importChannelVideos Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }
}
