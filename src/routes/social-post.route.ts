import express from "express";
import SocialPostCtrl from "../controllers/social-post.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/feed", authenticate, SocialPostCtrl.getFeed);
router.get("/", authenticate, SocialPostCtrl.getPosts);
router.get("/:id/comments", authenticate, SocialPostCtrl.getComments);
router.post("/", authenticate, SocialPostCtrl.createPost);
router.post("/:id/like", authenticate, SocialPostCtrl.toggleLike);
router.post("/:id/comment", authenticate, SocialPostCtrl.createComment);

export default router;
