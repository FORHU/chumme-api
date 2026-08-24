import { Request, Response } from "express";
import Joi from "joi";
import RoomUserChatSvc from "../services/room-user-chat.service";

export default class RoomUserChatCtrl {
  /**
   * Get user's joined rooms (paginated)
   */
  static async getUserChat(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      const chats = await RoomUserChatSvc.getUserChat(userId, page, limit);
      return res.json(chats);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Join a room subcategory
   */
  static async joinRoom(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { chummeSubCategoryId } = req.params;

    const schema = Joi.object({
      chummeSubCategoryId: Joi.string().required(),
      keyPassword: Joi.string().allow(null, "").optional(), // Optional password for join validation
    });

    const { error } = schema.validate({
      chummeSubCategoryId,
      keyPassword: req.body.keyPassword,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const membership = await RoomUserChatSvc.joinRoom(
        userId,
        chummeSubCategoryId,
        req.body.keyPassword,
      );
      return res.status(201).json({
        message: "Successfully joined room",
        membership,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Leave a room subcategory
   */
  static async leaveRoom(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { chummeSubCategoryId } = req.params;

    const schema = Joi.object({
      chummeSubCategoryId: Joi.string().required(),
    });

    const { error } = schema.validate({ chummeSubCategoryId });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await RoomUserChatSvc.leaveRoom(userId, chummeSubCategoryId);
      return res.json({ message: "Successfully left room" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get members of a room subcategory
   */
  static async getMembers(req: Request, res: Response) {
    const { chummeSubCategoryId } = req.params;
    const userId = (req as any).user.id;

    const schema = Joi.object({
      chummeSubCategoryId: Joi.string().required(),
    });

    const { error } = schema.validate({ chummeSubCategoryId });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const members = await RoomUserChatSvc.getRoomMembers(
        chummeSubCategoryId,
        userId,
      );
      return res.json({ members });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
