import { Request, Response } from "express";
import Joi from "joi";
import MusicSvc from "../services/music.service";
import S3Util from "../utils/s3.util";

export default class MusicCtrl {
  static async createMusic(req: Request, res: Response) {
    const file = req.file;
    if (!file && !req.body.file_url) {
      return res.status(400).json({ message: "File or file_url is required" });
    }

    // Parse meta_data if it's a string (e.g. from multipart form)
    if (typeof req.body.meta_data === "string") {
      try {
        req.body.meta_data = JSON.parse(req.body.meta_data);
      } catch (e) {
        return res.status(400).json({ message: "Invalid meta_data JSON" });
      }
    }

    const schema = Joi.object({
      title: Joi.string().required(),
      duration: Joi.number().allow(null),
      bpm: Joi.number().integer().allow(null),
      hasWordTiming: Joi.boolean(),
      meta_data: Joi.object().required(),
      release_date: Joi.date().iso().required(),
      file_url: Joi.string().uri().when("$hasFile", {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      musicAlbumId: Joi.string().uuid().allow(null),
      musicArtistId: Joi.string().uuid().allow(null),
      playlistId: Joi.string().uuid().allow(null),
    });

    const { error, value } = schema.validate(req.body, {
      context: { hasFile: !!file },
    });
    if (error) return res.status(400).json({ message: error.message });

    try {
      if (file) {
        value.file_url = await S3Util.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      const music = await MusicSvc.createMusic(value);
      return res.status(201).json(music);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async getMusicById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const music = await MusicSvc.getMusicById(id);
      return res.json(music);
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async getMusics(req: Request, res: Response) {
    const { albumId, artistId, playlistId } = req.query as any;
    try {
      const musics = await MusicSvc.getMusics({
        albumId,
        artistId,
        playlistId,
      });
      return res.json(musics);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async updateMusic(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      title: Joi.string(),
      duration: Joi.number().allow(null),
      bpm: Joi.number().integer().allow(null),
      hasWordTiming: Joi.boolean(),
      meta_data: Joi.object(),
      release_date: Joi.date().iso(),
      file_url: Joi.string().uri(),
      musicAlbumId: Joi.string().uuid().allow(null),
      musicArtistId: Joi.string().uuid(),
      playlistId: Joi.string().uuid().allow(null),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const music = await MusicSvc.updateMusic(id, value);
      return res.json(music);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async deleteMusic(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await MusicSvc.deleteMusic(id);
      return res.json({ message: "Music deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
