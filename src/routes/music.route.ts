import express from "express";
import MusicCtrl from "../controllers/music.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.use(authenticate);

// Named routes — must come before /:id wildcard
router.get("/list", MusicCtrl.getMusics);
router.get("/new-releases", MusicCtrl.getNewReleases);
router.get("/trending", MusicCtrl.getTrending);

router.get("/liked", MusicCtrl.getLikedSongs);
router.post("/:id/like", MusicCtrl.toggleLike);
router.get("/:id/stream", MusicCtrl.streamMusic);
router.post("/:id/play", MusicCtrl.recordPlay);
router.get("/:id", MusicCtrl.getMusicById);

// Main creation endpoint (handles both JSON and Multipart)
router.post(
  "/create",
  upload.any(), // Flexible handling of fields
  MusicCtrl.createMusicWithFiles,
);

// Alias for backward compatibility
router.post("/create-with-files", upload.any(), MusicCtrl.createMusicWithFiles);

router.patch("/update/:id", MusicCtrl.updateMusic);
router.delete("/delete/:id", MusicCtrl.deleteMusic);

export default router;
