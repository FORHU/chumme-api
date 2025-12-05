import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import UserChatCtrl from "../controllers/userChat.controller";

const router = express.Router();

router.post("/createRoom", authenticate, UserChatCtrl.createUserChatRoom);
router.get("/me", authenticate, UserChatCtrl.fetchActiveRooms);
router.get("/room-list", authenticate, UserChatCtrl.fetchRoomNameList);
router.get("/:roomId", authenticate, UserChatCtrl.fetchRoomById);

router.get("/members", UserChatCtrl.getRoomMembers);
router.post("/remove", authenticate, UserChatCtrl.removeUserInRoomChat)
router.delete("/delete", authenticate, UserChatCtrl.deleteRoomChat)
router.post("/privacy", UserChatCtrl.updateUserChatRoomPrivacy)


export default router;