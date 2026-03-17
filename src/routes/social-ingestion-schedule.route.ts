import { Router } from "express";
import * as scheduleController from "../controllers/social-ingestion-schedule.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Ingestion target schedules management (Admin authorized)
router.get("/target/:targetId", authenticate, scheduleController.getSchedulesByTarget);
router.post("/", authenticate, scheduleController.createSchedule);
router.put("/:id", authenticate, scheduleController.updateSchedule);
router.delete("/:id", authenticate, scheduleController.deleteSchedule);

export default router;
