import express from "express";
import MediaCtrl from "../controllers/media.controller";

const router = express.Router();

/**
 * @route   POST /api/v1/media/process
 * @desc    Triggers a media processing job (Optimization or HLS)
 * @access  Public (Consider adding auth middleware later)
 */
router.post("/process", MediaCtrl.processMedia);

/**
 * @route   GET /api/v1/media/metadata
 * @desc    Get media metadata (duration, format, resolution)
 * @access  Public
 */
router.get("/metadata", MediaCtrl.getMetadata);

/**
 * @route   GET /api/v1/media/thumbnail
 * @desc    Generate a thumbnail image from a video URL
 * @access  Public
 */
router.get("/thumbnail", MediaCtrl.getThumbnail);

export default router;
