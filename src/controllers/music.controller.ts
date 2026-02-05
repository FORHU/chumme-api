import { Request, Response } from "express";
import Joi from "joi";
import MusicSvc from "../services/music.service";
import FileSvc from "../services/file.service";

export default class MusicCtrl {
  static async createMusic(req: Request, res: Response) {
    const schema = Joi.object({
      title: Joi.string().required(),
      duration: Joi.number(),
      bpm: Joi.number().integer(),
      hasWordTiming: Joi.boolean(),
      release_date: Joi.date().iso().required(),
      musicFileId: Joi.string().uuid().required(),
      musicAlbumId: Joi.string().uuid().allow(null),
      musicArtistId: Joi.string().uuid(),
      isKaraoke: Joi.boolean(),
      meta_data: Joi.object().optional(),
    });

    const { error, value } = schema.validate(req.body);
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

      const music = await MusicSvc.createMusic({
        ...value,
        metaData: value.meta_data,
      });
      return res.status(201).json({
        message: "Music created successfully",
        data: music,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * TEST ONLY: Create music with direct file uploads (MP3 + JSON)
   * This is a temporary function for development.
   */
  static async testCreateMusic(req: Request, res: Response) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const metaDataFile = files?.meta_data?.[0];
    const musicFile = files?.fileData?.[0];

    // Prepare data
    const body = { ...req.body };
    if (typeof body.isKaraoke === "string")
      body.isKaraoke = body.isKaraoke === "true";
    if (typeof body.hasWordTiming === "string")
      body.hasWordTiming = body.hasWordTiming === "true";
    if (typeof body.duration === "string")
      body.duration = parseFloat(body.duration);
    if (typeof body.bpm === "string") body.bpm = parseInt(body.bpm);

    const schema = Joi.object({
      title: Joi.string().required(),
      duration: Joi.number(),
      bpm: Joi.number().integer(),
      hasWordTiming: Joi.boolean(),
      release_date: Joi.date().iso().required(),
      musicArtistId: Joi.string().uuid().required(),
      musicAlbumId: Joi.string().uuid().allow(null),
      playlistId: Joi.string().uuid(),
      order: Joi.number(),
      isKaraoke: Joi.boolean().default(true),
    });

    const { error, value } = schema.validate(body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      // 1. Parse JSON Metadata
      let metaData = {};
      if (metaDataFile) {
        metaData = JSON.parse(metaDataFile.buffer.toString());
      }

      // 2. Upload MP3 to S3 with metadata
      if (!musicFile) {
        return res.status(400).json({
          message: "music file (mp3) is required for this test route",
        });
      }
      const file = await FileSvc.uploadFile(
        musicFile.buffer,
        musicFile.originalname,
        musicFile.mimetype,
        metaData,
      );

      // 3. Create Music with automated phrasing logic in service
      const music = await MusicSvc.createMusic({
        ...value,
        musicFileId: file.id,
        metaData,
      });

      return res.status(201).json({
        message: "Test Music created successfully",
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
    const { albumId, artistId, playlistId, isKaraoke } = req.query as any;
    try {
      const musics = await MusicSvc.getMusics({
        albumId,
        artistId,
        playlistId,
        isKaraoke:
          isKaraoke === "true"
            ? true
            : isKaraoke === "false"
              ? false
              : undefined,
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
