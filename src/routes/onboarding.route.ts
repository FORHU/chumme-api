import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import OnboardingCtrl from "../controllers/onboarding.controller";

const router = Router();

/**
 * @route   GET /v1/onboarding/status
 * @desc    Onboarding step checklist (categories, YouTube link, etc.)
 * @access  Private
 */
router.get("/status", authenticate, OnboardingCtrl.getStatus);

/**
 * @route   POST /v1/onboarding/discovery
 * @desc    Save category / subcategory / topic selections (onboarding step)
 * @access  Private
 */
router.post("/discovery", authenticate, OnboardingCtrl.saveDiscovery);

/**
 * @route   POST /v1/onboarding/connect-google
 * @desc    Connect Google account during onboarding
 * @access  Private
 */
router.post("/connect-google", authenticate, OnboardingCtrl.connectGoogle);

/**
 * @route   POST /v1/onboarding/complete
 * @desc    Mark onboarding as complete
 * @access  Private
 */
router.post("/complete", authenticate, OnboardingCtrl.complete);

export default router;
