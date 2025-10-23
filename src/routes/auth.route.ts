import express from "express";
import AuthCtrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", AuthCtrl.register);
router.post("/login", AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshToken);
router.post("/forgot-password", AuthCtrl.forgotPassword);
router.post("/reset-password", AuthCtrl.resetPassword);

export default router;