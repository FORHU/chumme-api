import { Request, Response } from "express";
import YouTubeService from "../../services/net-communities/youtube.service";
import { LiveProvisioningService } from "../../services/live-provisioning.service";

export default class YouTubeCtrl {
  /**
   * On-demand live refresh for a single chat room.
   * Called by the mobile player when its YouTube embed fails — the stored
   * activeVideoId may be stale (the broadcast ended and a new one started).
   */
  static async refreshRoomLive(req: Request, res: Response) {
    try {
      const { roomId } = req.params;
      if (!roomId) {
        return res.status(400).json({ message: "roomId is required" });
      }

      const result = await LiveProvisioningService.refreshByRoom(roomId);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Room or linked artist not found" });
      }

      return res.json({
        message: "Live status refreshed",
        data: result,
      });
    } catch (error: any) {
      console.error("YouTubeCtrl.refreshRoomLive Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

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
      const regionCode = req.headers["x-country-code"] as string | undefined;

      if (!q) {
        return res
          .status(400)
          .json({ message: "Search query 'q' is required" });
      }

      const results = await YouTubeService.searchVideos(
        q as string,
        maxResults ? parseInt(maxResults as string) : 5,
        regionCode,
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
}
