import express from "express";
import PlaylistCtrl from "../controllers/playlist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/list", PlaylistCtrl.getAllPlaylists);
router.get("/:id", PlaylistCtrl.getPlaylistById);

router.use(authenticate);

router.post("/create", PlaylistCtrl.createPlaylist);

// New RESTful endpoints
router.patch("/:id", PlaylistCtrl.patchPlaylist);
router.post("/:id/tracks", PlaylistCtrl.addTrack);
router.delete("/:id/tracks/:musicId", PlaylistCtrl.removeTrack);

// Legacy aliases (kept for backward compatibility)
router.patch("/update/:id", PlaylistCtrl.updatePlaylist);
router.delete("/delete/:id", PlaylistCtrl.deletePlaylist);

export default router;
