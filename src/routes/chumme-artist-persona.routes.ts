import { Router } from "express";
import * as chummeArtistPersonaController from "../controllers/chumme-artist-persona.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes (if any)
// router.get("/artist/:artistId", artistPersonaController.getPersonaByArtistId);

// Protected routes
router.use(authenticate);

router.get("/", chummeArtistPersonaController.getAllPersonas);
router.get("/artist/:artistId", chummeArtistPersonaController.getPersonaByArtistId);
router.post("/", chummeArtistPersonaController.createPersona);
router.patch("/:id", chummeArtistPersonaController.updatePersona);

export default router;
