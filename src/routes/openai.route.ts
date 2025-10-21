import express from "express";
const router = express.Router();

import OpenAICtrl from "../controllers/openai.controller";
router.post("/response", OpenAICtrl.getAIResponse);

export default router;
