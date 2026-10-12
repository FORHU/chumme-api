import express from "express";
import AuthCtrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimit } from "../middleware/auth-rate-limit.middleware";

const router = express.Router();

router.post("/register", authRateLimit, AuthCtrl.register);
router.post("/verify-otp", authRateLimit, AuthCtrl.verifyOtp);
router.post("/verify-email", authRateLimit, AuthCtrl.verifyEmail);
router.post("/login", authRateLimit, AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshToken);
router.post("/forgot-password", authRateLimit, AuthCtrl.forgotPassword);
router.post("/reset-password", authRateLimit, AuthCtrl.resetPassword);
router.post(
  "/resend-verification-otp",
  authRateLimit,
  AuthCtrl.resendVerificationOTP,
);
router.post("/google-sso", authRateLimit, AuthCtrl.googleAuthSSO);
router.post("/facebook-sso", authRateLimit, AuthCtrl.facebookAuthSSO);
router.post("/logout", authenticate, AuthCtrl.logout);

// Signed-in credential changes. Both are two-step: the request mints an OTP,
// the confirm redeems it. Email codes go to the *new* address, password codes
// to the current one.
router.post(
  "/change-password/request",
  authRateLimit,
  authenticate,
  AuthCtrl.requestPasswordChange,
);
router.post(
  "/change-password/confirm",
  authRateLimit,
  authenticate,
  AuthCtrl.confirmPasswordChange,
);
router.post(
  "/change-email/request",
  authRateLimit,
  authenticate,
  AuthCtrl.requestEmailChange,
);
router.post(
  "/change-email/confirm",
  authRateLimit,
  authenticate,
  AuthCtrl.confirmEmailChange,
);
router.post("/change-email/cancel", authenticate, AuthCtrl.cancelEmailChange);

export default router;
