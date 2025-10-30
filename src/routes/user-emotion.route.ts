import express from "express";
import * as userEmotionController from "../controllers/user-emotion.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authenticate, userEmotionController.getAllEmotions);
router.get("/me", authenticate, userEmotionController.getUserEmotions);
router.post("/me", authenticate, userEmotionController.addUserEmotions);
router.delete("/me/:id", authenticate, userEmotionController.removeUserEmotion);

export default router;
