import { Router } from "express";
import MusicLibraryCtrl from "../controllers/music-library.controller";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), MusicLibraryCtrl.uploadMusicFile);
router.get("/:id", MusicLibraryCtrl.getMusicFile);
router.delete("/:id", MusicLibraryCtrl.deleteMusicFile);

export default router;
