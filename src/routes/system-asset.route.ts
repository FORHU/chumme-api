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
router.get("/", SystemAssetCtrl.listAssets);

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

/**
 * @route   PATCH /v1/system-assets/:id
 * @desc    Update system asset
 * @access  Private (Admin)
 */
router.patch("/:id", authenticate, SystemAssetCtrl.updateAsset);

/**
 * @route   DELETE /v1/system-assets/:id
 * @desc    Soft delete system asset
 * @access  Private (Admin)
 */
router.delete("/:id", authenticate, SystemAssetCtrl.deleteAsset);

export default router;

