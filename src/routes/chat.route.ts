import express from "express";
const router = express.Router();

import ChatCtrl from "../controllers/chat.controller";

router.post("/send",  ChatCtrl.sendChat);
router.get("/list", ChatCtrl.getChatListByUserId);
router.get("/id/:chatId", ChatCtrl.getChatByChatId);

export default router;
