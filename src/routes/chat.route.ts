import express from "express";
const router = express.Router();

import ChatCtrl from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";

router.post("/send", authenticate, ChatCtrl.sendChat);
router.post("/wonder", authenticate, ChatCtrl.sendWonderChat);
router.get("/list", authenticate, ChatCtrl.getChatListByUserId);
router.get("/id/:chatId", authenticate, ChatCtrl.getChatByChatId);
router.get("/conversation", authenticate, ChatCtrl.getAiChatHeader);

export default router;
