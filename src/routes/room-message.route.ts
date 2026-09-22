import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import RoomMessageCtrl from "../controllers/room-message.controller";
import MessageTranslationCtrl from "../controllers/message-translation.controller";
import { translateRateLimit } from "../middleware/translate-rate-limit.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/", RoomMessageCtrl.sendMessage);
router.post(
  "/:messageId/translate",
  translateRateLimit,
  MessageTranslationCtrl.translateCircleMessage,
);
router.get("/:chummeSubCategoryId", RoomMessageCtrl.getRoomMessages);
router.delete("/:id", RoomMessageCtrl.removeMessage);

export default router;
