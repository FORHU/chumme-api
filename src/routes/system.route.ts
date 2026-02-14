import express from "express";
import SystemCtrl from "../controllers/system.controller";

const router = express.Router();

router.post("/cache/clear", SystemCtrl.clearCache);

export default router;
