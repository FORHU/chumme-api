import express from "express";
import FileCtrl from "../controllers/file.controller";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.post("/", FileCtrl.saveFile);
router.post("/upload", upload.single("file"), FileCtrl.uploadFile);
router.get("/:id", FileCtrl.getFile);
router.delete("/:id", FileCtrl.deleteFile);

export default router;