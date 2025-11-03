import express from "express";
import VideoCtrl from "../controllers/video.controller";

const router = express.Router();

router.post("/", VideoCtrl.saveVideo);

export default router;