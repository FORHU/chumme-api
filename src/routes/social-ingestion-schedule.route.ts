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

// --- SEQUENTIAL CHAIN CONTROL ---
// Skip current chain step and move to next platform
router.post(
  "/chain/skip",
  authenticate,
  scheduleController.skipChainStep,
);

// Start/Resume chain sequence manually
router.post(
  "/chain/start",
  authenticate,
  scheduleController.startChain,
);

// Get current chain status (active step, pending count, etc.)
router.get(
  "/chain/status",
  authenticate,
  scheduleController.getChainStatus,
);

// --- ANALYTICS & SNAPSHOTS ---
// Retrieve historical performance snapshots for a specific feed item
router.get(
  "/feed/:id/snapshots",
  authenticate,
  scheduleController.getSnapshots,
);

export default router;
