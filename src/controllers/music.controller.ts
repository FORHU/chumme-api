import { Request, Response } from "express";
import Joi from "joi";
import MusicSvc from "../services/music.service";
import MusicLibrarySvc from "../services/music-library.service";

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
      vocalRolesCount: Joi.number().integer().min(1),
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
    const { page, limit, albumId, artistId, playlistId, isKaraoke } =
      req.query as any;
    try {
      const result = await MusicSvc.getMusics({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
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
      return res.json(result);
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
      vocalRolesCount: Joi.number().integer().min(1),
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

  static async createMusicWithFiles(req: Request, res: Response) {
    // With upload.any(), req.files is an array
    const files = req.files as Express.Multer.File[];

    try {
      // 1. Handle FormData string-to-type parsing
      if (typeof req.body.hasWordTiming === "string") {
        req.body.hasWordTiming = req.body.hasWordTiming === "true";
      }
      if (typeof req.body.isKaraoke === "string") {
        req.body.isKaraoke = req.body.isKaraoke === "true";
      }
      if (typeof req.body.duration === "string") {
        req.body.duration = Number(req.body.duration);
      }
      if (typeof req.body.bpm === "string") {
        req.body.bpm = Number(req.body.bpm);
      }
      if (typeof req.body.vocalRolesCount === "string") {
        req.body.vocalRolesCount = Number(req.body.vocalRolesCount);
      }

      // Default release_date if missing
      if (!req.body.release_date) {
        req.body.release_date = new Date().toISOString();
      }

      // Handle empty UUID strings from frontend
      if (req.body.musicAlbumId === "") req.body.musicAlbumId = null;
      if (req.body.musicArtistId === "") req.body.musicArtistId = null;

      // 2. Parse meta_data file if present
      const metaFile = files?.find(
        (f) => f.fieldname === "meta_data" || f.fieldname === "metaData",
      );

      if (metaFile) {
        try {
          req.body.meta_data = JSON.parse(metaFile.buffer.toString("utf-8"));
        } catch (e) {
          console.warn("[MusicCtrl] Failed to parse meta_data file", e);
        }
      } else if (typeof req.body.metaData === "string") {
        try {
          req.body.meta_data = JSON.parse(req.body.metaData);
        } catch (e) {
          /* ignore */
        }
      } else if (typeof req.body.meta_data === "string") {
        try {
          req.body.meta_data = JSON.parse(req.body.meta_data);
        } catch (e) {
          /* ignore */
        }
      }

      const schema = Joi.object({
        title: Joi.string().required(),
        duration: Joi.number().allow(null, ""),
        bpm: Joi.number().integer().allow(null, ""),
        hasWordTiming: Joi.boolean(),
        release_date: Joi.date().iso().required(),
        musicAlbumId: Joi.string().uuid().allow(null, ""),
        musicArtistId: Joi.string().uuid().allow(null, ""),
        isKaraoke: Joi.boolean(),
        vocalRolesCount: Joi.number().integer().min(1).allow(null, ""),
        meta_data: Joi.object().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      // 3. Early Check for duplication (BEFORE costly S3 upload)
      const existing = await MusicSvc.getMusicByTitle(value.title);
      if (existing) {
        return res.status(400).json({
          message: "Music with this title already exists",
          data: existing,
        });
      }

      // 4. Locate the audio file (support 'fileData' or 'file' field)
      const audioFile = files?.find(
        (f) => f.fieldname === "fileData" || f.fieldname === "file",
      );
      if (!audioFile) {
        return res.status(400).json({
          message: "Audio file is required (field: fileData or file)",
        });
      }

      // 5. Upload Audio File to MusicLibrary
      const fileRecord = await MusicLibrarySvc.uploadMusicFile(
        audioFile.buffer,
        audioFile.originalname,
        audioFile.mimetype,
      );

      // 6. Create Music using the new file ID
      const music = await MusicSvc.createMusic({
        ...value,
        musicFileId: fileRecord.id,
        metaData: value.meta_data,
      });

      return res.status(201).json({
        message: "Music created successfully with files",
        data: music,
      });
    } catch (error: any) {
      console.error("[MusicCtrl] Error in createMusicWithFiles:", error);
      return res.status(500).json({ message: error.message || error });
    }
  }
}
