import { Request, Response } from "express";
import Joi from "joi";
import SportMessageSvc from "../services/sport-message.service";

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  before: Joi.string().uuid().optional(),
});

const sendSchema = Joi.object({
  sportTeamId: Joi.string().uuid().required(),
  content: Joi.string().allow("").optional(),
  voiceMessageId: Joi.string().uuid().optional(),
  duration: Joi.number().min(0).optional(),
  waveform: Joi.array().items(Joi.number()).optional(),
});

export default class SportMessageCtrl {
  static async getMessages(req: Request, res: Response) {
    try {
      const { error, value } = listQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const result = await SportMessageSvc.getMessages({
        sportEventId: req.params.eventId,
        limit: value.limit,
        before: value.before,
      });

      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error("[SportMessageCtrl] Error fetching messages:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch messages",
      });
    }
  }

  /**
   * HTTP send. The socket path is the one the app uses in practice; this exists
   * so a message can still be posted when the socket is down, and so the flow is
   * testable with curl.
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { error, value } = sendSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const message = await SportMessageSvc.sendMessage({
        sportEventId: req.params.eventId,
        sportTeamId: value.sportTeamId,
        authorId: req.user.id,
        content: value.content,
        voiceMessageId: value.voiceMessageId,
        duration: value.duration,
        waveform: value.waveform,
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      // These are all "you asked for something impossible" rather than server
      // faults — a 500 here would send people looking in the wrong place.
      const isClientError = /not playing|not found|too long|needs either/i.test(
        error?.message ?? "",
      );
      return res.status(isClientError ? 400 : 500).json({
        success: false,
        message: error?.message || "Failed to send message",
      });
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      const result = await SportMessageSvc.deleteMessage(
        req.params.messageId,
        req.user.id,
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error?.message || "Failed to delete message",
      });
    }
  }
}
