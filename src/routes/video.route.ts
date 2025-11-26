import express from "express";
import VideoCtrl from "../controllers/video.controller";

const router = express.Router();

router.post("/saveVideo", VideoCtrl.saveVideo);
router.put("/upsertVideo", VideoCtrl.upsertVideo);

export default router;