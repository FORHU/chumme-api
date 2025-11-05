import express from "express";
import FeedCtrl from "../controllers/feed.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", FeedCtrl.getFeed);
router.get("/personalized", authenticate, FeedCtrl.getPersonalizedFeed);

export default router;
