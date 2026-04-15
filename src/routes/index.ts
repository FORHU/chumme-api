import express from "express";
import chummeArtistPersonaRoute from "./artist-persona.routes";
import ingestionScheduleRoute from "./social-ingestion-schedule.route";

import authRoute from "./auth.route";
import chatRoutes from "./chat.route";
import userRoute from "./user.route";
import postRoute from "./social-post.route";
import socialUserDiscoveryRoute from "./social-user-discovery.route";

import chummeCategoryRoute from "./chumme-category.route";
import chummeSubCategoryRoute from "./chumme-subcategory.route";
import chummeTopicCategoryRoute from "./chumme-topic-category.route";

import userInterestRoute from "./user-interest.route";
import userEmotionRoute from "./user-emotion.route";
import chummeArtistRoute from "./chumme-artist.route";
import fileRoute from "./file.route";
import healthRoute from "./health.route";
import feedRoute from "./social-feed.route";
import bookmarkRoute from "./social-bookmark.route";
import conversationRoute from "./conversation.route";
import RoomUserChatRoute from "./room-user-chat.route";
import roomMessageRoute from "./room-message.route";
import chatWonderRoute from "./chat-wonder.route";
import musicAlbumRoute from "./music-album.route";
import musicRoute from "./music.route";
import playlistRoute from "./playlist.route";
import musicRecordRoute from "./music-record.route";
import musicStudioRoute from "./music-studio.route";
import musicLibraryRoute from "./music-library.route";
import mediaRoute from "./media.route";
import apkRoute from "./web/apk.route";
import searchRoute from "./search.route";

import systemRoute from "./system.route";
import socialAccountRoute from "./net-communities/session-social-account.route";
import youtubeRoute from "./net-communities/youtube.route";
import monitoringRoute from "./web/monitoring.route";
import discoveryRoute from "./discovery.route";
import onboardingRoute from "./onboarding.route";

const router = express.Router();

// ... existing routes

router.use("/v1/system", systemRoute);
router.use("/v1/session-social-accounts", socialAccountRoute);
router.use("/v1/youtube", youtubeRoute);
router.use("/v1/monitoring", monitoringRoute);
router.use("/v1/discovery", discoveryRoute);
router.use("/v1/onboarding", onboardingRoute);

router.get("/v1", (_, res) => {
  res.json({
    message: "Welcome to my API",
  });
});

router.use("/v1/auth", authRoute);
router.use("/v1/chat", chatRoutes);
router.use("/v1/users", userRoute);
router.use("/v1/posts", postRoute);
router.use("/v1/user-chat", RoomUserChatRoute);

router.use("/v1/chumme-categories", chummeCategoryRoute);
router.use("/v1/chumme-subcategories", chummeSubCategoryRoute);
router.use("/v1/chumme-topic-categories", chummeTopicCategoryRoute);

router.use("/v1/interests", userInterestRoute);
router.use("/v1/emotions", userEmotionRoute);
router.use("/v1/social-discovery", socialUserDiscoveryRoute);
router.use("/v1/artists", chummeArtistRoute);
router.use("/v1/files", fileRoute);
router.use("/v1/feed", feedRoute);
router.use("/v1/conversations", conversationRoute);
router.use("/v1/bookmark", bookmarkRoute);
router.use("/v1/room-messages", roomMessageRoute);
router.use("/v1", healthRoute);

router.use("/v1/chat-wonder", chatWonderRoute);
router.use("/v1/artist-persona", chummeArtistPersonaRoute);
router.use("/v1/music-albums", musicAlbumRoute);
router.use("/v1/music", musicRoute);
router.use("/v1/search", searchRoute);
router.use("/v1/playlists", playlistRoute);
router.use("/v1/music-records", musicRecordRoute);
router.use("/v1/music-studios", musicStudioRoute);
router.use("/v1/music-library", musicLibraryRoute);
router.use("/v1/media", mediaRoute);
router.use("/v1/ingestion-schedules", ingestionScheduleRoute);
router.use("/v1/apk", apkRoute);

export default router;
