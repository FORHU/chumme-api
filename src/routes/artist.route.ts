import express from "express";
import * as artistController from "../controllers/artist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// Public/Authenticated routes
router.get("/", authenticate, artistController.getAllArtists);
router.get("/me", authenticate, artistController.getUserArtists);
router.post("/me", authenticate, artistController.addUserArtists);
router.delete("/me/:artistId", authenticate, artistController.removeUserArtist);

// CRUD routes for Artist entity
router.get("/:id", authenticate, artistController.getArtistById);
router.post("/", authenticate, artistController.createArtist);
router.put("/:id", authenticate, artistController.updateArtist);
router.delete("/:id", authenticate, artistController.deleteArtist);

export default router;
