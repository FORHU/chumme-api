import express from "express";
import * as chummeArtistController from "../controllers/chumme-artist.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";

const router = express.Router();

// Public/Authenticated routes
router.get("/", authenticate, chummeArtistController.getAllArtists);

// Skip onboarding by selecting random artists
router.post(
  "/skip-onboarding",
  authenticate,
  chummeArtistController.skipOnboarding,
);

router.get("/me", authenticate, chummeArtistController.getUserArtists);
router.post("/me", authenticate, chummeArtistController.addUserArtists);
router.delete(
  "/me/:artistId",
  authenticate,
  chummeArtistController.removeUserArtist,
);

// CRUD routes for Artist entity
router.get("/:id", authenticate, chummeArtistController.getArtistById);
router.post("/", authenticate, requireRoles(["CREATOR", "ADMIN"]), chummeArtistController.createArtist);
router.put("/:id", authenticate, requireRoles(["CREATOR", "ADMIN"]), chummeArtistController.updateArtist);
router.delete("/:id", authenticate, requireRoles(["CREATOR", "ADMIN"]), chummeArtistController.deleteArtist);

export default router;
