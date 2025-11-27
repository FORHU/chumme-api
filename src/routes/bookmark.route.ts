import express from "express";
import BookmarkCtrl from "../controllers/bookmark.controller";

const router = express.Router();

router.get("/", BookmarkCtrl.getBookmark);
router.patch("/upsert", BookmarkCtrl.upsertBookmark);
router.delete("/me", BookmarkCtrl.deleteBookmark);

export default router;