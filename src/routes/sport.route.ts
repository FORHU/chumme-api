import express from "express";
import SportCtrl from "../controllers/sport.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// Named routes first — `/fixtures/:id` must not be shadowed by a wildcard.
router.get("/leagues", SportCtrl.getLeagues);
router.get("/leagues/:leagueId/teams", SportCtrl.getTeamsByLeague);

router.get("/fixtures", SportCtrl.getFixtures);
router.get("/fixtures/:id", SportCtrl.getFixtureById);

export default router;
