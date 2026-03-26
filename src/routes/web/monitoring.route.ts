import express from "express";
import MonitoringCtrl from "../../controllers/monitoring.controller";

const router = express.Router();

router.get("/pipeline", MonitoringCtrl.getPipelineStatus);
router.get("/trigger-crawl", MonitoringCtrl.triggerCrawl);
router.get("/content/:id/history", MonitoringCtrl.getContentHistory);

// Web Dashboard Enpoints
router.get("/analytics/trends", MonitoringCtrl.getAnalytics);
router.get("/worker/health", MonitoringCtrl.getHealthDetails);

export default router;
