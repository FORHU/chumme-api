import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import MessageCtrl from "../controllers/message.controller";

const router = express.Router();
router.use(authenticate);

router.get("/:roomId", MessageCtrl.getRoomMessages);

export default router;
