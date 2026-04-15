import { Request, Response } from "express";
import Joi from "joi";
import SearchSvc from "../services/search.service";

export default class SearchCtrl {
  static async search(req: Request, res: Response) {
    const schema = Joi.object({
      q: Joi.string().min(1).max(200).required(),
      type: Joi.string()
        .valid("tracks", "albums", "artists", "playlists", "all")
        .default("all"),
      limit: Joi.number().integer().min(1).max(50).default(10),
    });

    const { error, value } = schema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const results = await SearchSvc.search(value);
      return res.json({ data: results });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }
}
