import { Request, Response } from "express";
import CacheUtil from "../utils/cache.util";

export default class SystemCtrl {
  static async clearCache(req: Request, res: Response) {
    try {
      await CacheUtil.flushAll();
      return res.json({ message: "Redis cache cleared successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
