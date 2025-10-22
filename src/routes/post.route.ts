import express from "express";
import PostCtrl from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", authenticate, PostCtrl.createPost);

export default router;