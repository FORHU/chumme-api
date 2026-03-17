import express from "express";
import * as Ctrl from "../controllers/system-setting.controller";

const router = express.Router();

router.get("/:key", Ctrl.getSetting);
router.post("/", Ctrl.updateSetting);

export default router;
