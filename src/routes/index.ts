import express from "express";
import authRoute from "./auth.route";
import chatRoutes from "./chat.route";
import userRoute from "./user.route";
import postRoute from "./post.route";
import roomRoute from "./room.route";
import onboardingRoute from "./onboarding.route";

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
router.use("/v1/rooms", roomRoute);
router.use("/v1/onboarding", onboardingRoute);


export default router;


