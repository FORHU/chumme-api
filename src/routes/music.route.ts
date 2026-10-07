import express from "express";
import MusicCtrl from "../controllers/music.controller";
import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.use(optionalAuthenticate);

// Named routes — must come before /:id wildcard
router.get("/list", MusicCtrl.getMusics);
router.get("/new-releases", MusicCtrl.getNewReleases);
router.get("/trending", MusicCtrl.getTrending);

router.get("/liked", authenticate, MusicCtrl.getLikedSongs);
router.post("/:id/like", authenticate, MusicCtrl.toggleLike);
router.get("/:id/stream", MusicCtrl.streamMusic);
router.post("/:id/play", MusicCtrl.recordPlay);
router.get("/:id", MusicCtrl.getMusicById);

// Main creation endpoint (handles both JSON and Multipart)
//
// Any signed-in Chumme user can upload their own song. `authenticate` runs
// before `upload.any()` so an anonymous request is rejected before its files
// are buffered, and the controller stamps `ownerId: req.user.id` on the record.
router.post(
  "/create",
  authenticate,
  upload.any(), // Flexible handling of fields
  MusicCtrl.createMusicWithFiles,
);

// JSON-only creation endpoint
router.post("/create-with-json", authenticate, MusicCtrl.createMusic);

// Alias for backward compatibility
router.post(
  "/create-with-files",
  authenticate,
  upload.any(),
  MusicCtrl.createMusicWithFiles,
);

// Only the uploader can change or delete a song — enforced in
// MusicSvc.assertOwner, which answers 404 / 403.
router.patch("/update/:id", authenticate, MusicCtrl.updateMusic);
router.delete("/delete/:id", authenticate, MusicCtrl.deleteMusic);

export default router;
