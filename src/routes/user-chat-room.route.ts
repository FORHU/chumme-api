import express from "express";
import UserChatRoomCtrl from "../controllers/user-chat-room.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/join/:roomSubCategoryId", UserChatRoomCtrl.joinRoom);
router.delete("/leave/:roomSubCategoryId", UserChatRoomCtrl.leaveRoom);
router.get("/members/:roomSubCategoryId", UserChatRoomCtrl.getMembers);

export default router;
