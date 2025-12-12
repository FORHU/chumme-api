import { Request, Response } from "express";
import UserChatSvc from "../services/user-chat.service";

export default class UserChatCtrl {
  static async getUserChat(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const chats = await UserChatSvc.getUserChat(userId, page, limit);
      return res.json(chats);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}
