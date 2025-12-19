import MessageSvc from "../services/message.service";
import { Request, Response } from "express";

export default class MessageCtrl {
  static async getRoomMessages(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      if (!req.params.roomId) {
        return res.status(400).json({ message: "Room ID is required" });
      }
      if (!req.user.id) {
        return res.status(400).json({ message: "Unauthorized User!" });
      }
      const response = await MessageSvc.getRoomMessages(
        req.params.roomId,
        req?.user?.id,
        page,
        limit
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
}
