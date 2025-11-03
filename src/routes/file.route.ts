import express from "express";
import FileCtrl from "../controllers/file.controller";

const router = express.Router();

router.post("/", FileCtrl.saveFile);

export default router;