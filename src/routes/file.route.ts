import express from "express";
import FileCtrl from "../controllers/file.controller";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

/*
 * presigned url routes
 */
router.post("/get-upload-url", FileCtrl.getUploadUrl);
router.get("/get-download-url", FileCtrl.getDownloadUrl);

/*
 * file routes
 */
router.get("/", FileCtrl.getAllFiles);
router.post("/", FileCtrl.saveFile);
router.post("/upload", upload.single("file"), FileCtrl.uploadFile);
router.put("/upsert", FileCtrl.upsertFile);
router.get("/:id", FileCtrl.getFile);
router.get("/download/:id", FileCtrl.downloadFileById);
router.delete("/:id", FileCtrl.deleteFile);

export default router;
