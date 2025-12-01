import express from "express";
import BookmarkCtrl from "../controllers/bookmark.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/me", authenticate, BookmarkCtrl.getAllBookmarks);
router.post("/upsert", authenticate, BookmarkCtrl.upsertBookmark);

export default router;