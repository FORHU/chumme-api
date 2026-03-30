import express from "express";
import * as userInterestController from "../controllers/user-interest.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authenticate, userInterestController.getAllInterests);
router.get("/me", authenticate, userInterestController.getUserInterests);
router.post("/me", authenticate, userInterestController.addUserInterests);
router.delete(
  "/me/:id",
  authenticate,
  userInterestController.removeUserInterest,
);

export default router;
