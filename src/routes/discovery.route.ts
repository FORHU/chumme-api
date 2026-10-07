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
// Manual crawl triggers — disabled until the crawler is in use. They were
// unauthenticated, so anyone could start a crawl and spend the YouTube quota.
// Re-enable behind `authenticate, requireRoles([UserRole.ADMIN])`.
//
// /**
//  * @route POST /v1/discovery/trigger-crawl
//  * @desc Manually trigger full video crawl and scouting
//  */
// router.post("/trigger-crawl", DiscoveryCtrl.triggerCrawl);
//
// router.post(
//   "/trigger-crawler/:targetId",
//   DiscoveryCtrl.triggerCrawlerByTargetId,
// );

export default router;
