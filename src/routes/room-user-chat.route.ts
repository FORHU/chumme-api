import express from "express";
import RoomUserChatCtrl from "../controllers/room-user-chat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/join/:chummeSubCategoryId", RoomUserChatCtrl.joinRoom);
router.delete("/leave/:chummeSubCategoryId", RoomUserChatCtrl.leaveRoom);
router.get("/members/:chummeSubCategoryId", RoomUserChatCtrl.getMembers);

export default router;
