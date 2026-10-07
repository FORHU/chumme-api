import express from "express";
import { UserRole } from "@prisma/client";
import MonitoringCtrl from "../controllers/monitoring.controller";
import { authenticate, requireRoles } from "../middleware/auth.middleware";

const router = express.Router();

// Pipeline internals — admins only (DEVELOPER passes requireRoles too).
router.use(authenticate, requireRoles([UserRole.ADMIN]));

router.get("/pipeline", MonitoringCtrl.getPipelineStatus);
// Manual crawl trigger — disabled until the crawler is in use. As a GET it
// could be fired by simply opening the URL.
// router.get("/trigger-crawl", MonitoringCtrl.triggerCrawl);
router.get("/content/:id/history", MonitoringCtrl.getContentHistory);

// Web Dashboard Enpoints
router.get("/analytics/trends", MonitoringCtrl.getAnalytics);
router.get("/worker/health", MonitoringCtrl.getHealthDetails);

export default router;
