import express from "express";
import RoomUserChatCtrl from "../controllers/room-user-chat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/join/:roomSubCategoryId", RoomUserChatCtrl.joinRoom);
router.delete("/leave/:roomSubCategoryId", RoomUserChatCtrl.leaveRoom);
router.get("/members/:roomSubCategoryId", RoomUserChatCtrl.getMembers);

export default router;
