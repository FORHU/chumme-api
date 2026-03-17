import { Router } from "express";
import * as scheduleController from "../controllers/social-ingestion-schedule.controller";
import { authenticate } from "../middleware/auth.middleware";

/**
 * Social Ingestion Hub
 * This router manages all aspects of content ingestion:
 * 1. Automatic Scheduling (Cron cycles)
 * 2. Manual Triggering (On-demand crawling)
 * 3. Historical Analytics Snapshots
 */
const router = Router();

// --- SCHEDULING MANAGEMENT ---
// Fetch all schedules linked to a specific ingestion target
router.get(
  "/target/:targetId",
  authenticate,
  scheduleController.getSchedulesByTarget,
);

// CRUD for automated schedules (AUTO vs MANUAL modes)
router.post("/", authenticate, scheduleController.createSchedule);
router.put("/:id", authenticate, scheduleController.updateSchedule);
router.delete("/:id", authenticate, scheduleController.deleteSchedule);

// --- MANUAL INGESTION ---
// Manually trigger an immediate backup/crawl for a target
router.post(
  "/:id/trigger",
  authenticate,
  scheduleController.triggerScheduleNow,
);

// --- ANALYTICS & SNAPSHOTS ---
// Retrieve historical performance snapshots for a specific feed item
router.get(
  "/feed/:id/snapshots",
  authenticate,
  scheduleController.getSnapshots,
);

export default router;
