import { Request, Response } from "express";
import Joi from "joi";
import MusicSvc from "../services/music.service";

export default class MusicCtrl {
  static async createMusic(req: Request, res: Response) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.fileData?.[0];
    const metaDataFile = files?.meta_data?.[0];

    if (!file && !req.body.musicFileId) {
      return res
        .status(400)
        .json({ message: "File upload (fileData) or musicFileId is required" });
    }

    const schema = Joi.object({
      title: Joi.string().required(),
      duration: Joi.number(),
      bpm: Joi.number().integer(),
      hasWordTiming: Joi.boolean(),
      release_date: Joi.date().iso().required(),
      musicFileId: Joi.string().uuid().when("$hasFile", {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      musicAlbumId: Joi.string().uuid(),
      musicArtistId: Joi.string().uuid(),
      isKaraoke: Joi.boolean(),
      meta_data: Joi.object().optional(),
    });

    const { error, value } = schema.validate(req.body, {
      context: { hasFile: !!file },
    });
    if (error) return res.status(400).json({ message: error.message });

    try {
      // Check if music already exists by title
      const existing = await MusicSvc.getMusicByTitle(value.title);
      if (existing) {
        return res.status(400).json({
          message: "Music with this title already exists",
          data: existing,
        });
      }

      // Pass file to service if uploaded
      const fileData = file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          }
        : undefined;

      // Handle custom metadata from file or body
      let customMetaData = value.meta_data;
      if (metaDataFile) {
        try {
          customMetaData = JSON.parse(metaDataFile.buffer.toString());
        } catch (e) {
          return res
            .status(400)
            .json({ message: "Invalid JSON in meta_data file" });
        }
      }

      const music = await MusicSvc.createMusic(
        { ...value, metaData: customMetaData },
        fileData,
      );
      return res.status(201).json({
        message: "Music created successfully",
        data: music,
      });
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
      release_date: Joi.date().iso(),
      musicFileId: Joi.string().uuid(),
      musicAlbumId: Joi.string().uuid().allow(null),
      musicArtistId: Joi.string().uuid(),
      playlistId: Joi.string().uuid().allow(null),
      isKaraoke: Joi.boolean(),
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
