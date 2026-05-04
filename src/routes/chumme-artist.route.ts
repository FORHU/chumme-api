import express from "express";
import * as chummeArtistController from "../controllers/chumme-artist.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const router = express.Router();

// Public/Authenticated routes
router.get("/", authenticate, chummeArtistController.getAllArtists);
router.get("/live", authenticate, chummeArtistController.getLiveArtists);

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
router.post("/", authenticate, requireRoles([UserRole.CREATOR, UserRole.ADMIN]), chummeArtistController.createArtist);
router.put("/:id", authenticate, requireRoles([UserRole.CREATOR, UserRole.ADMIN]), chummeArtistController.updateArtist);
router.delete("/:id", authenticate, requireRoles([UserRole.CREATOR, UserRole.ADMIN]), chummeArtistController.deleteArtist);

export default router;
