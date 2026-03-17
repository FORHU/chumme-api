import express from "express";
import DiscoveryCtrl from "../controllers/discovery.controller";

const router = express.Router();

/**
 * @route GET /v1/discovery/trending
 * @desc Get high-growth social media content
 */
router.get("/trending", DiscoveryCtrl.getTrending);

/**
 * @route GET /v1/discovery/rising-stars
 * @desc Get high-potential draft artists
 */
router.get("/rising-stars", DiscoveryCtrl.getRisingStars);

/**
 * @route POST /v1/discovery/calculate-scores
 * @desc Manually trigger growth score calculation
 */
router.post("/calculate-scores", DiscoveryCtrl.triggerRankingCalculation);

export default router;
