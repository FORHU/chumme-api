import express from "express";
import PostCtrl from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authenticate, PostCtrl.getPosts);
router.post("/", authenticate, PostCtrl.createPost);
router.post("/:id/like", authenticate, PostCtrl.toggleLike);
router.post("/:id/comment", authenticate, PostCtrl.createComment);
router.get("/:id/comments", authenticate, PostCtrl.getComments);

export default router;