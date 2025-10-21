import express from "express";
import UserCtrl from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/me", authenticate, UserCtrl.getCurrentUser);

export default router;