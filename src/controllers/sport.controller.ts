import { Request, Response } from "express";
import Joi from "joi";
import SportSvc from "../services/sport.service";

const fixturesQuerySchema = Joi.object({
  // ISO instants, not calendar dates — see the note in sport.repository.ts on
  // why the day boundary is the client's decision.
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  leagueId: Joi.string().uuid().optional(),
  teamId: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

export default class SportCtrl {
  static async getLeagues(_req: Request, res: Response) {
    try {
      const leagues = await SportSvc.getLeagues();
      return res.status(200).json({ success: true, data: leagues });
    } catch (error: any) {
      console.error("[SportCtrl] Error fetching leagues:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch leagues",
      });
    }
  }

  static async getFixtures(req: Request, res: Response) {
    try {
      const { error, value } = fixturesQuerySchema.validate(req.query);
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: error.message });
      }

      if (value.from && value.to && value.from > value.to) {
        return res.status(400).json({
          success: false,
          message: "`from` must be earlier than `to`",
        });
      }

      const result = await SportSvc.getFixtures(value);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error("[SportCtrl] Error fetching fixtures:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch fixtures",
      });
    }
  }

  static async getFixtureById(req: Request, res: Response) {
    try {
      const fixture = await SportSvc.getFixtureById(req.params.id);
      if (!fixture) {
        return res
          .status(404)
          .json({ success: false, message: "Fixture not found" });
      }
      return res.status(200).json({ success: true, data: fixture });
    } catch (error: any) {
      console.error("[SportCtrl] Error fetching fixture:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch fixture",
      });
    }
  }

  static async getTeamsByLeague(req: Request, res: Response) {
    try {
      const teams = await SportSvc.getTeamsByLeague(req.params.leagueId);
      return res.status(200).json({ success: true, data: teams });
    } catch (error: any) {
      console.error("[SportCtrl] Error fetching teams:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch teams",
      });
    }
  }
}
