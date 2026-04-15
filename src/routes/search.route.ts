import express from "express";
import SearchCtrl from "../controllers/search.controller";

const router = express.Router();

// GET /v1/search?q=&type=tracks|albums|artists|playlists|all&limit=
router.get("/", SearchCtrl.search);

export default router;
