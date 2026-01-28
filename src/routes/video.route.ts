import express from "express";
import VideoCtrl from "../controllers/video.controller";

const router = express.Router();

router.post("/save", VideoCtrl.saveVideo);
router.put("/upsert", VideoCtrl.upsertVideo);
router.get("/find-by-emotion", VideoCtrl.findByEmotion);

export default router;
