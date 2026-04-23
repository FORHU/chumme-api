import express from "express";
import MusicStudioCtrl from "../controllers/music-studio.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// List endpoints
router.get("/list", MusicStudioCtrl.getStudios);
router.get("/names", MusicStudioCtrl.getStudioNames);
router.get("/my-studios", MusicStudioCtrl.getMyStudios);
router.get("/joined", MusicStudioCtrl.getJoinedStudios);

// Single studio
router.get("/:studioId", MusicStudioCtrl.getStudioById);
router.get("/:studioId/users", MusicStudioCtrl.getStudioUsers);

// Create & manage
router.post("/create", MusicStudioCtrl.createStudio);
router.post("/:studioId/join", MusicStudioCtrl.joinStudio);
router.post("/:studioId/leave", MusicStudioCtrl.leaveStudio);

// Update
router.patch("/:studioId", MusicStudioCtrl.updateStudio);
router.patch(
  "/:studioId/members/:userId/role",
  MusicStudioCtrl.updateMemberRole,
);

// Recording flow via HTTP
router.post("/:studioId/start-recording", MusicStudioCtrl.startRecording);
router.post("/:studioId/stop-recording", MusicStudioCtrl.stopRecording);
router.post("/:studioId/save-recording", MusicStudioCtrl.saveRecording);
router.post("/:studioId/preview-recording", MusicStudioCtrl.previewRecording);

// Delete
router.delete("/:studioId", MusicStudioCtrl.closeStudio);

export default router;
