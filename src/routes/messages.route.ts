import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import MessageCtrl from "../controllers/message.controller";

const router = express.Router();
router.use(authenticate);

router.post("/", MessageCtrl.sendMessage);
router.get("/:roomSubCategoryId", MessageCtrl.getRoomMessages);
router.delete("/:id", MessageCtrl.removeMessage);

export default router;
