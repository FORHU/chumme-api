import { Router } from "express";
import * as artistPersonaController from "../controllers/artist-persona.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes (if any)
// router.get("/artist/:artistId", artistPersonaController.getPersonaByArtistId);

// Protected routes
router.use(authenticate);

router.get("/", artistPersonaController.getAllPersonas);
router.get("/artist/:artistId", artistPersonaController.getPersonaByArtistId);
router.post("/", artistPersonaController.createPersona);
router.patch("/:id", artistPersonaController.updatePersona);

export default router;
