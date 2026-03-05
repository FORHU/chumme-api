import MessageSvc from "../services/message.service";
import { Request, Response } from "express";
import Joi from "joi";

export default class MessageCtrl {
  /**
   * Send a message to a room
   */
  static async sendMessage(req: Request, res: Response) {
    const userId = (req as any).user.id;

    const schema = Joi.object({
      roomSubCategoryId: Joi.string().uuid().required(),
      content: Joi.any().required(),
      voiceMessageId: Joi.string().uuid().optional(),
      parentMessageId: Joi.string().uuid().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const message = await MessageSvc.createMessage({
        ...value,
        userId,
      });
      return res.status(201).json({
        message: "Message sent",
        data: message,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get messages for a room
   */
  static async getRoomMessages(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { roomSubCategoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const parentMessageId = req.query.parentMessageId as string;

    const schema = Joi.object({
      roomSubCategoryId: Joi.string().uuid().required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      parentMessageId: Joi.string().uuid().optional(),
    });

    const { error } = schema.validate({
      roomSubCategoryId,
      page,
      limit,
      parentMessageId,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const response = await MessageSvc.getRoomMessages(
        roomSubCategoryId,
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
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * Remove a message
   */
  static async removeMessage(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      await MessageSvc.removeMessage(id, userId);
      return res.json({ message: "Message deleted" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
