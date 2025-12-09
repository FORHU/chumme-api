import express from "express";
import authRoute from "./auth.route";
import chatRoutes from "./chat.route";
import userRoute from "./user.route";
import postRoute from "./post.route";
import roomRoute from "./room.route";
import roomMemberRoute from "./roomMember.route";
import onboardingRoute from "./onboarding.route";
import userInterestRoute from "./user-interest.route";
import userEmotionRoute from "./user-emotion.route";
import artistRoute from "./artist.route";
import fileRoute from "./file.route";
import videoRoute from "./video.route";
import healthRoute from "./health.route";
import feedRoute from "./feed.route";
import bookmarkRoute from "./bookmark.route";
import userChatRoute from "./userChat.route";

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
router.use("/v1/userChat", userChatRoute);
router.use("/v1/rooms", roomRoute);
router.use("/v1/roomMember", roomMemberRoute);
router.use("/v1/onboarding", onboardingRoute);
router.use("/v1/interests", userInterestRoute);
router.use("/v1/emotions", userEmotionRoute);
router.use("/v1/artists", artistRoute);
router.use("/v1/files", fileRoute);
router.use("/v1/videos", videoRoute);
router.use("/v1/feed", feedRoute);
router.use("/v1/bookmark", bookmarkRoute);
router.use("/v1", healthRoute);

export default router;
