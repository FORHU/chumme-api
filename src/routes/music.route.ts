import express from "express";
import MusicCtrl from "../controllers/music.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/list", MusicCtrl.getMusics);
router.get("/:id", MusicCtrl.getMusicById);

router.use(authenticate);

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
