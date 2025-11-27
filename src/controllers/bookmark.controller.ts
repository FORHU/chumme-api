import { Request, Response } from "express";
import Joi from "joi";

export default class BookmarkCtrl {
  static async upsertBookmark(req: Request, res: Response) {
    try {
      // return res.status(201).json({ message: "File saved", file });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getBookmark(req: Request, res: Response) {
    try {
      // return res.status(200).json({ file });
    } catch (err: any) {
      const statusCode = err.message === "File not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async deleteBookmark(req: Request, res: Response) {
    try {
      // return res.status(200).json({ file });
    } catch (err: any) {
      const statusCode = err.message === "File not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }
}
