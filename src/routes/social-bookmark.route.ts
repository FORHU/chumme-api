import express from "express";
import SocialBookmarkCtrl from "../controllers/social-bookmark.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/me", authenticate, SocialBookmarkCtrl.getAllBookmarks);
router.post("/upsert", authenticate, SocialBookmarkCtrl.upsertBookmark);

export default router;
