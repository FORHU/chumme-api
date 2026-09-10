import express from "express";
import FileCtrl from "../controllers/file.controller";
import { upload } from "../middleware/upload.middleware";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// This router had NO authentication. `/get-upload-url` therefore let anyone who
// could reach the API mint a presigned PUT for any key in the bucket. It was
// only ever inert because the signing credentials were dead; restoring signing
// without this line would have made it live.
router.use(authenticate);

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
