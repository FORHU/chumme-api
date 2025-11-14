import express from "express";
import * as artistController from "../controllers/artist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authenticate, artistController.getAllArtists);
router.get("/me", authenticate, artistController.getUserArtists);
router.post("/me", authenticate, artistController.addUserArtists);
router.delete("/me/:artistId", authenticate, artistController.removeUserArtist);

export default router;