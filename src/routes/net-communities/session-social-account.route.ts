import { Router } from "express";
import SessionSessionSocialAccountCtrl from "../../controllers/net-communities/session-social-account.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

/**
 * @route   POST /v1/social-accounts/link
 * @desc    Link a new social platform to the current user
 * @access  Private
 */
router.post("/link", authenticate, SessionSessionSocialAccountCtrl.linkAccount);

/**
 * @route   GET /v1/social-accounts/me
 * @desc    Get list of connected social accounts for the current user
 * @access  Private
 */
router.get("/me", authenticate, SessionSessionSocialAccountCtrl.getMyAccounts);

/**
 * @route   DELETE /v1/social-accounts/:platform
 * @desc    Unlink a specific social platform
 * @access  Private
 */
router.delete("/:platform", authenticate, SessionSessionSocialAccountCtrl.unlinkAccount);

export default router;
