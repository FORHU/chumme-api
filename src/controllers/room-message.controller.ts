import RoomMessageSvc from "../services/room-message.service";
import CircleAccessSvc from "../services/circle-access.service";
import RoomMediaPolicySvc from "../services/room-media-policy.service";
import { Request, Response } from "express";
import Joi from "joi";

export default class RoomMessageCtrl {
  /**
   * Send a message to a room
   */
  static async sendMessage(req: Request, res: Response) {
    const userId = (req as any).user.id;

    const schema = Joi.object({
      chummeSubCategoryId: Joi.string().required(),
      content: Joi.any().required(),
      voiceMessageId: Joi.string().uuid().optional(),
      videoMessageId: Joi.string().uuid().optional(),
      parentMessageId: Joi.string().uuid().optional(),
      duration: Joi.number().min(0).optional(),
      waveform: Joi.array().items(Joi.number()).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const message = await RoomMessageSvc.createMessage({
        ...value,
        userId,
      });
      return res.status(201).json({
        message: "Message sent",
        data: message,
      });
    } catch (error: any) {
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || error });
    }
  }

  /**
   * Voice/video limits for the caller in a room (admin vs member)
   */
  static async getMediaLimits(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { chummeSubCategoryId } = req.params;

    try {
      await CircleAccessSvc.assertRoomAccess(chummeSubCategoryId, userId);
      const limits = await RoomMediaPolicySvc.getLimits(
        chummeSubCategoryId,
        userId,
      );
      return res.json({ success: true, data: limits });
    } catch (err: any) {
      return res
        .status(err.statusCode || 400)
        .json({ message: err.message || err });
    }
  }

  /**
   * Get messages for a room
   */
  static async getRoomMessages(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { chummeSubCategoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const parentMessageId = req.query.parentMessageId as string;

    const schema = Joi.object({
      chummeSubCategoryId: Joi.string().required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      parentMessageId: Joi.string().uuid().optional(),
    });

    const { error } = schema.validate({
      chummeSubCategoryId,
      page,
      limit,
      parentMessageId,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await CircleAccessSvc.assertRoomAccess(chummeSubCategoryId, userId);
      const response = await RoomMessageSvc.getRoomMessages(
        chummeSubCategoryId,
        userId,
        page,
        limit,
        parentMessageId,
      );
      return res.json({
        success: true,
        data: response,
        pagination: {
          page,
          limit,
          hasMore: response?.length === limit,
        },
      });
    } catch (err: any) {
      return res
        .status(err.statusCode || 400)
        .json({ message: err.message || err });
    }
  }

  /**
   * Remove a message
   */
  static async removeMessage(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      await RoomMessageSvc.removeMessage(id, userId);
      return res.json({ message: "Message deleted" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
