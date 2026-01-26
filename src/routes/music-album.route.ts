import express from "express";
import MusicAlbumCtrl from "../controllers/music-album.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

router.get("/list", MusicAlbumCtrl.getAllAlbums);
router.get("/:id", MusicAlbumCtrl.getAlbumById);

router.post("/create", MusicAlbumCtrl.createAlbum);
router.patch("/update/:id", MusicAlbumCtrl.updateAlbum);
router.delete("/delete/:id", MusicAlbumCtrl.deleteAlbum);

export default router;
