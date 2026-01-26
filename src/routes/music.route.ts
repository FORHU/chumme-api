import express from "express";
import MusicCtrl from "../controllers/music.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

router.get("/list", MusicCtrl.getMusics);
router.get("/:id", MusicCtrl.getMusicById);

router.post("/create", MusicCtrl.createMusic);
router.patch("/update/:id", MusicCtrl.updateMusic);
router.delete("/delete/:id", MusicCtrl.deleteMusic);

export default router;
