import express from "express";
import MusicCtrl from "../controllers/music.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.use(authenticate);

router.get("/list", MusicCtrl.getMusics);
router.get("/:id", MusicCtrl.getMusicById);

router.post(
  "/create",
  upload.fields([
    { name: "file_url", maxCount: 1 },
    { name: "meta_data", maxCount: 1 },
  ]),
  MusicCtrl.createMusic,
);
router.patch("/update/:id", MusicCtrl.updateMusic);
router.delete("/delete/:id", MusicCtrl.deleteMusic);

export default router;
