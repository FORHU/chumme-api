import express from "express";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// router.get("/me", authenticate, UserCtrl.getCurrentUser);
// router.delete("/me", authenticate, UserCtrl.deleteAccount);
// router.patch("/me", authenticate, UserCtrl.updateUser);
// router.get("/", authenticate, UserCtrl.getAllUsers);

export default router;