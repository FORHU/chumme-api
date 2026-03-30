import { Router, text } from "express";
import SocialWebhookController from "../controllers/social-webhook.controller";

const router = Router();

// 1. YouTube WebSub callback
// Verification challenge (GET)
// Notification feed (POST as Atom/XML)
router.get("/youtube", SocialWebhookController.verifyYouTube);
router.post(
  "/youtube",
  text({ type: "application/atom+xml" }), // Specialized parser for WebSub
  SocialWebhookController.notifyYouTube,
);

export default router;
