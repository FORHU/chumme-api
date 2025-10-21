import express from "express";
const router = express.Router();

import ChatCtrl from "../controllers/chat.controller";

router.post("/create", ChatCtrl.createChat);
router.get("/all", ChatCtrl.getChats);

export default router;
