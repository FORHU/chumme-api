import express from "express";
import RoomMemberCtrl from "../controllers/roomMember.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.get("/:id/list", RoomMemberCtrl.getRoomMembers); 

export default router;