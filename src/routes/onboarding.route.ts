import express from "express";
import OnboardingCtrl from "../controllers/onboarding.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/status", authenticate, OnboardingCtrl.getStatus);
router.post("/interests", authenticate, OnboardingCtrl.saveInterests);
router.post("/emotions", authenticate, OnboardingCtrl.saveEmotions);
router.post("/artists", authenticate, OnboardingCtrl.saveArtists);
router.patch("/complete", authenticate, OnboardingCtrl.complete);

export default router;
