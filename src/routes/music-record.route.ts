import express from "express";
import MusicRecordCtrl from "../controllers/music-record.controller";

const router = express.Router();

// List all music records (with pagination)
router.get("/list", MusicRecordCtrl.getAll);

// Get recordings by user
router.get("/user/:userId", MusicRecordCtrl.getByUserId);

// Get recordings by music/song
router.get("/music/:musicId", MusicRecordCtrl.getByMusicId);

// Get single music record
router.get("/:id", MusicRecordCtrl.getById);

// Create new music record
router.post("/", MusicRecordCtrl.create);

// Delete music record
router.delete("/:id", MusicRecordCtrl.delete);

export default router;
