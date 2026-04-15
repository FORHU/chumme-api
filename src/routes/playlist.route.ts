import express from "express";
import PlaylistCtrl from "../controllers/playlist.controller";
import {
  authenticate,
  optionalAuthenticate,
  requirePlaylistOwner,
} from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

// Public / optional-auth reads
router.get("/list", optionalAuthenticate, PlaylistCtrl.getAllPlaylists);
router.get("/:id", PlaylistCtrl.getPlaylistById);

// All routes below require a valid token
router.use(authenticate);

// Create — ownership of new playlist belongs to requester, no guard needed
router.post("/create", PlaylistCtrl.createPlaylist);

// Mutation routes — all guarded: must own the playlist
router.patch("/:id",                  requirePlaylistOwner, PlaylistCtrl.patchPlaylist);
router.post("/:id/cover",             requirePlaylistOwner, upload.single("cover"), PlaylistCtrl.uploadCover);
router.post("/:id/tracks",            requirePlaylistOwner, PlaylistCtrl.addTrack);
router.delete("/:id/tracks/:musicId", requirePlaylistOwner, PlaylistCtrl.removeTrack);
router.delete("/delete/:id",          requirePlaylistOwner, PlaylistCtrl.deletePlaylist);

// Legacy update alias
router.patch("/update/:id",           requirePlaylistOwner, PlaylistCtrl.updatePlaylist);

export default router;
