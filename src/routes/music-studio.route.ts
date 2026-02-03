import express from "express";
import MusicStudioCtrl from "../controllers/music-studio.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// List endpoints
router.get("/list", MusicStudioCtrl.getStudios);
router.get("/my-studios", MusicStudioCtrl.getMyStudios);
router.get("/joined", MusicStudioCtrl.getJoinedStudios);

// Single studio
router.get("/:id", MusicStudioCtrl.getStudioById);
router.get("/:id/users", MusicStudioCtrl.getStudioUsers);

// Create & manage
router.post("/create", MusicStudioCtrl.createStudio);
router.post("/:id/join", MusicStudioCtrl.joinStudio);
router.post("/:id/leave", MusicStudioCtrl.leaveStudio);

// Update
router.patch("/:id", MusicStudioCtrl.updateStudio);
router.patch("/:id/members/:userId/role", MusicStudioCtrl.updateMemberRole);

// Delete
router.delete("/:id", MusicStudioCtrl.closeStudio);

export default router;
