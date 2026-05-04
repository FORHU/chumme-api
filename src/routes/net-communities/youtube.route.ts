import express from "express";
import YouTubeCtrl from "../../controllers/net-communities/youtube.controller";

const router = express.Router();

/**
 * @route   GET /v1/youtube/video-details
 * @desc    Fetch metadata for a specific YouTube video (via URL or ID)
 * @access  Public
 */
router.get("/video-details", YouTubeCtrl.getVideoDetails);

/**
 * @route   GET /v1/youtube/search
 * @desc    Search for YouTube videos by query string
 * @access  Public
 */
router.get("/search", YouTubeCtrl.searchVideos);

/**
 * @route   GET /v1/youtube/channel-videos
 * @desc    Fetch latest videos from a YouTube channel uploads (using handle or channelId)
 * @access  Public
 */
router.get("/channel-videos", YouTubeCtrl.getChannelVideos);

/**
 * @route   GET /v1/youtube/playlist-videos
 * @desc    Fetch videos from a specific YouTube playlist
 * @access  Public
 */
router.get("/playlist-videos", YouTubeCtrl.getPlaylistVideos);

/**
 * @route   POST /v1/youtube/rooms/:roomId/refresh-live
 * @desc    Force-refresh the live status for the artist linked to a chat room.
 *          Called by the mobile player when its embed fails to detect a stale
 *          activeVideoId without waiting for the next 15-min heartbeat.
 * @access  Public
 */
router.post("/rooms/:roomId/refresh-live", YouTubeCtrl.refreshRoomLive);

export default router;
