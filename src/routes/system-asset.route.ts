import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import SystemAssetCtrl from "../controllers/system-asset.controller";

const router = Router();

/**
 * @route   GET /v1/system-assets
 * @desc    List all system assets
 * @access  Private
 */
router.get("/", authenticate, SystemAssetCtrl.listAssets);

/**
 * @route   GET /v1/system-assets/:key
 * @desc    Get system asset by key
 * @access  Public
 */
router.get("/:key", SystemAssetCtrl.getAsset);

/**
 * @route   POST /v1/system-assets/upload
 * @desc    Upload/update system asset
 * @access  Private (Admin)
 */
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  SystemAssetCtrl.uploadAsset,
);

export default router;
