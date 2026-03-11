import express from "express";
import * as chummeArtistController from "../controllers/chumme-artist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// Public/Authenticated routes
router.get("/", authenticate, chummeArtistController.getAllArtists);

// Skip onboarding by selecting random artists
router.post("/skip-onboarding", authenticate, chummeArtistController.skipOnboarding);

router.get("/me", authenticate, chummeArtistController.getUserArtists);
router.post("/me", authenticate, chummeArtistController.addUserArtists);
router.delete("/me/:artistId", authenticate, chummeArtistController.removeUserArtist);

// CRUD routes for Artist entity
router.get("/:id", authenticate, chummeArtistController.getArtistById);
router.post("/", authenticate, chummeArtistController.createArtist);
router.put("/:id", authenticate, chummeArtistController.updateArtist);
router.delete("/:id", authenticate, chummeArtistController.deleteArtist);

export default router;
