import express from "express";
import * as ArtistCtrl from "../controllers/artist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authenticate, ArtistCtrl.getAllArtists);
router.get("/me", authenticate, ArtistCtrl.getUserArtists);
router.post("/me", authenticate, ArtistCtrl.addUserArtists);

export default router;