import express from "express";
const router = express.Router();

import ConversationCtrl from "../controllers/conversation.controller";
import { authenticate } from "../middleware/auth.middleware";

// Create new conversation
router.post("/", authenticate, ConversationCtrl.createConversation);

// Get all conversations for user
router.get("/", authenticate, ConversationCtrl.getConversations);

// Get single conversation by ID
router.get("/:id", authenticate, ConversationCtrl.getConversationById);

// Get messages in a conversation
router.get(
  "/:id/messages",
  authenticate,
  ConversationCtrl.getConversationMessages,
);

// Update conversation title
router.patch("/:id/title", authenticate, ConversationCtrl.updateTitle);

// Delete conversation (soft delete)
router.delete("/:id", authenticate, ConversationCtrl.deleteConversation);

export default router;
