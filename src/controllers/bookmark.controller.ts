import { Request, Response } from "express";
import Joi from "joi";
import BookmarkSvc from "../services/bookmark.service";

export default class BookmarkCtrl {
  static async getAllBookmarks(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      const bookmark = await BookmarkSvc.fetchAllUserBookmarks(req?.user?.id, page, limit);
      res.json({
        success: true,
        data: bookmark,
        pagination: {
          page,
          limit,
          hasMore: bookmark?.length === limit,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async upsertBookmark(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        userId: Joi.string().optional(),
        bookmarkId: Joi.string(),
      });
      const { error, value } = schema.validate(req.body);

      if (error) return res.status(400).json({ message: error.message });

      const bookmark = await BookmarkSvc.saveBookmark(
        value.userId,
        value.bookmarkId
      );
      return res.status(201).json({ message: "File saved", bookmark });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
