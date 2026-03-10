import express from "express";
import artistPersonaRoute from "./artist-persona.routes";
import authRoute from "./auth.route";
import chatRoutes from "./chat.route";
import userRoute from "./user.route";
import postRoute from "./social-post.route";

import chummeCategoryRoute from "./chumme-category.route";
import chummeSubCategoryRoute from "./chumme-subcategory.route";
import onboardingRoute from "./onboarding.route";
import userInterestRoute from "./user-interest.route";
import userEmotionRoute from "./user-emotion.route";
import artistRoute from "./artist.route";
import fileRoute from "./file.route";
import videoRoute from "./video.route";
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

import systemRoute from "./system.route";
import youtubeRoute from "./youtube.route";

const router = express.Router();

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
router.use("/v1/onboarding", onboardingRoute);
router.use("/v1/interests", userInterestRoute);
router.use("/v1/emotions", userEmotionRoute);
router.use("/v1/artists", artistRoute);
router.use("/v1/files", fileRoute);
router.use("/v1/videos", videoRoute);
router.use("/v1/feed", feedRoute);
router.use("/v1/conversations", conversationRoute);
router.use("/v1/bookmark", bookmarkRoute);
router.use("/v1/room-messages", roomMessageRoute);
router.use("/v1", healthRoute);

router.use("/v1/chat-wonder", chatWonderRoute);
router.use("/v1/artist-persona", artistPersonaRoute);
router.use("/v1/music-albums", musicAlbumRoute);
router.use("/v1/music", musicRoute);
router.use("/v1/playlists", playlistRoute);
router.use("/v1/music-records", musicRecordRoute);
router.use("/v1/music-studios", musicStudioRoute);
router.use("/v1/music-library", musicLibraryRoute);
router.use("/v1/media", mediaRoute);
router.use("/v1/system", systemRoute);
router.use("/v1/youtube", youtubeRoute);

export default router;
