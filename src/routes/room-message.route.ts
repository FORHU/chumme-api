import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import RoomMessageCtrl from "../controllers/room-message.controller";

const router = express.Router();
router.use(authenticate);

router.post("/", RoomMessageCtrl.sendMessage);
router.get("/:chummeSubCategoryId", RoomMessageCtrl.getRoomMessages);
router.delete("/:id", RoomMessageCtrl.removeMessage);

export default router;
