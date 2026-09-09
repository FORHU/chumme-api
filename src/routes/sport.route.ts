import express from "express";
import SportCtrl from "../controllers/sport.controller";
import SportMessageCtrl from "../controllers/sport-message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticate);

// Named routes first — `/fixtures/:id` must not be shadowed by a wildcard.
router.get("/leagues", SportCtrl.getLeagues);
router.get("/leagues/:leagueId/teams", SportCtrl.getTeamsByLeague);

router.get("/fixtures", SportCtrl.getFixtures);
router.get("/fixtures/:id", SportCtrl.getFixtureById);

// Match-room chat. The room IS the fixture, so it needs no separate id and no
// provisioning — any ingested fixture is immediately chattable.
router.get("/fixtures/:eventId/messages", SportMessageCtrl.getMessages);
router.post("/fixtures/:eventId/messages", SportMessageCtrl.sendMessage);
router.delete("/messages/:messageId", SportMessageCtrl.deleteMessage);

export default router;
