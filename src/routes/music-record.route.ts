import express from "express";
import MusicRecordCtrl from "../controllers/music-record.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// List all music records (with pagination)
router.get("/list", MusicRecordCtrl.getAll);

// Get recordings by studio
router.get("/studio/:studioId", MusicRecordCtrl.getByStudioId);

// Get recordings by music/song
router.get("/music/:musicId", MusicRecordCtrl.getByMusicId);

// fetch Music By User Id
router.get("/album/:userId", MusicRecordCtrl.getMusicByUserId);

// Get single music record
router.get("/:id", MusicRecordCtrl.getById);

// Create new music record
router.post("/", MusicRecordCtrl.create);

// Delete music record
router.delete("/:id", MusicRecordCtrl.delete);

export default router;
