import express from "express";
import AuthCtrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", AuthCtrl.register);
router.post("/verify-otp", AuthCtrl.verifyOtp);
router.post("/verify-email", AuthCtrl.verifyEmail);
router.post("/login", AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshToken);
router.post("/forgot-password", AuthCtrl.forgotPassword);
router.post("/reset-password", AuthCtrl.resetPassword);
router.post("/resend-verification-otp", AuthCtrl.resendVerificationOTP);
router.post("/google-sso", AuthCtrl.googleAuthSSO);
router.post("/facebook-sso", AuthCtrl.facebookAuthSSO);
router.post("/logout", authenticate, AuthCtrl.logout);

// Signed-in credential changes. Both are two-step: the request mints an OTP,
// the confirm redeems it. Email codes go to the *new* address, password codes
// to the current one.
router.post(
  "/change-password/request",
  authenticate,
  AuthCtrl.requestPasswordChange,
);
router.post(
  "/change-password/confirm",
  authenticate,
  AuthCtrl.confirmPasswordChange,
);
router.post("/change-email/request", authenticate, AuthCtrl.requestEmailChange);
router.post("/change-email/confirm", authenticate, AuthCtrl.confirmEmailChange);
router.post("/change-email/cancel", authenticate, AuthCtrl.cancelEmailChange);

export default router;
