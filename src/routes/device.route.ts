import express from "express";
import { UserRole } from "@prisma/client";
import DeviceTokenCtrl from "../controllers/device-token.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// The app calls these on sign-in / token refresh and on sign-out.
router.post("/push-token", DeviceTokenCtrl.register);
router.delete("/push-token", DeviceTokenCtrl.unregister);

// Sends to the caller's own devices only.
router.post(
  "/test-push",
  requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  DeviceTokenCtrl.sendTestPush,
);

export default router;
