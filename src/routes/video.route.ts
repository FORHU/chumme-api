import express from "express";
import VideoCtrl from "../controllers/video.controller";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.post("/save", VideoCtrl.saveVideo);
router.post("/upload", upload.any(), VideoCtrl.uploadVideo);
router.put("/upsert", VideoCtrl.upsertVideo);
router.get("/find-by-emotion", VideoCtrl.findByEmotion);

export default router;
