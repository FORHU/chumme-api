import { Router } from "express";
import MusicLibraryCtrl from "../controllers/music-library.controller";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

/*
 * presigned url routes
 */
router.post("/get-upload-url", MusicLibraryCtrl.getUploadUrl);
router.get("/get-download-url", MusicLibraryCtrl.getDownloadUrl);

/*
 * music library routes
 */
router.post("/", MusicLibraryCtrl.saveMusicFile);
router.post("/upload", upload.single("file"), MusicLibraryCtrl.uploadMusicFile);
router.get("/:id", MusicLibraryCtrl.getMusicFile);
router.delete("/:id", MusicLibraryCtrl.deleteMusicFile);

export default router;
