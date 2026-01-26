import express from "express";
import PlaylistCtrl from "../controllers/playlist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

router.get("/list", PlaylistCtrl.getAllPlaylists);
router.get("/:id", PlaylistCtrl.getPlaylistById);

router.post("/create", PlaylistCtrl.createPlaylist);
router.patch("/update/:id", PlaylistCtrl.updatePlaylist);
router.delete("/delete/:id", PlaylistCtrl.deletePlaylist);

export default router;
