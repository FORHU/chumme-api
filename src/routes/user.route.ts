import express from "express";
import UserCtrl from "../controllers/user.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/me", authenticate, UserCtrl.getCurrentUser);
router.delete("/me", authenticate, UserCtrl.deleteAccount);
router.patch("/me", authenticate, UserCtrl.updateUser);
router.post("/admin", authenticate, requireRoles([UserRole.ADMIN]), UserCtrl.createAdmin);

// Admin user management
router.patch("/:id/status", authenticate, requireRoles([UserRole.ADMIN]), UserCtrl.updateUserStatus);

export default router;
