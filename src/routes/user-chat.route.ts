import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import UserChatCtrl from "../controllers/user-chat.controller";

const router = express.Router();
router.use(authenticate);

router.get("/", UserChatCtrl.getUserChat); 

export default router;