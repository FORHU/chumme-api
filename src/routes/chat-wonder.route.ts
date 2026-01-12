import express from "express";
const router = express.Router();

import { authenticate } from "../middleware/auth.middleware";
import ChatWonderCtrl from "../controllers/chat-wonder.controller";

router.post("/send", authenticate, ChatWonderCtrl.sendChat);
router.post('/stream', authenticate, ChatWonderCtrl.streamChat);

export default router;
