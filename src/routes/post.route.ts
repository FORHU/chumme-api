import express from "express";
import PostCtrl from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";
import { postRateLimit, commentRateLimit, likeRateLimit } from "../config/rate-limit.config";

const router = express.Router();

router.get("/feed", authenticate, PostCtrl.getFeed);
router.get("/", authenticate, PostCtrl.getPosts);
router.get("/:id/comments", authenticate, PostCtrl.getComments);
router.post("/", authenticate, postRateLimit, PostCtrl.createPost);
router.post("/:id/like", authenticate, likeRateLimit, PostCtrl.toggleLike);
router.post("/:id/comment", authenticate, commentRateLimit, PostCtrl.createComment);


export default router;