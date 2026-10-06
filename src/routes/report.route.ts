import express from "express";
import { UserRole } from "@prisma/client";
import ModerationCtrl from "../controllers/moderation.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

router.post("/", ModerationCtrl.submitReport);

// Review queue
router.get(
  "/",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  ModerationCtrl.listReports,
);
router.patch(
  "/:id",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  ModerationCtrl.resolveReport,
);

export default router;
