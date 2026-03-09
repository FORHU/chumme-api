import express from "express";
import SocialFeedCtrl from "../controllers/social-feed.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", SocialFeedCtrl.getFeed);
router.get("/personalized", authenticate, SocialFeedCtrl.getPersonalizedFeed);

export default router;
