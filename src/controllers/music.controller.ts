import { Request, Response } from "express";
import Joi from "joi";
import MusicSvc from "../services/music.service";
import LikedSongSvc from "../services/liked-song.service";
import MusicLibrarySvc from "../services/music-library.service";
import MediaQueueSvc from "../services/media-queue.service";
import logger from "../utils/logger";

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
      genre: Joi.string().allow(null, ""),
    }).unknown(true);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const music = await MusicSvc.createMusic({
        ...value,
        metaData: value.meta_data,
        ownerId: req.user.id,
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
    logger.info(`[MusicCtrl] getMusicById called for ID: ${id}`);
    try {
      const music = await MusicSvc.getMusicById(id);
      return res.json(music);
    } catch (error: any) {
      logger.error(`[MusicCtrl] Error in getMusicById: ${error.message}`);
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async getMusics(req: Request, res: Response) {
    const {
      page,
      limit,
      albumId,
      artistId,
      playlistId,
      isKaraoke,
      search,
      genre,
      sort,
    } = req.query as any;
    logger.info(`[MusicCtrl] getMusics called`, {
      page,
      limit,
      albumId,
      artistId,
      playlistId,
      isKaraoke,
      search,
    });
    try {
      const result = await MusicSvc.getMusics({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        albumId,
        artistId,
        playlistId,
        search,
        genre,
        sort,
        isKaraoke:
          isKaraoke === "true"
            ? true
            : isKaraoke === "false"
              ? false
              : undefined,
      });
      logger.info(
        `[MusicCtrl] getMusics returning ${result.data?.length || 0} items`,
      );
      return res.json(result);
    } catch (error: any) {
      logger.error(`[MusicCtrl] Error in getMusics: ${error.message}`);
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
      album: Joi.string().allow(null, ""),
      genre: Joi.string().allow(null, ""),
      metaData: Joi.object().optional(),
    })
      .min(1)
      .unknown(true);

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

  static async toggleLike(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await LikedSongSvc.toggleLike(req.user.id, id);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async getLikedSongs(req: Request, res: Response) {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(20),
      cursor: Joi.string().optional(),
    });
    const { error, value } = schema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await LikedSongSvc.getLikedSongs(req.user.id, value);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async getNewReleases(req: Request, res: Response) {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(20),
      cursor: Joi.string().optional(),
    });
    const { error, value } = schema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicSvc.getNewReleases(value);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async getTrending(req: Request, res: Response) {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(20),
    });
    const { error, value } = schema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicSvc.getTrending(value.limit);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async recordPlay(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await MusicSvc.recordPlay(id);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async streamMusic(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await MusicSvc.getStreamInfo(id);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
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
        playlistId: Joi.string().uuid().allow(null, ""),
        musicFileId: Joi.string().uuid().optional(),
        isKaraoke: Joi.boolean(),
        vocalRolesCount: Joi.number().integer().min(1).allow(null, ""),
        meta_data: Joi.object().optional(),
        genre: Joi.string().allow(null, ""),
        fileType: Joi.string()
          .valid(
            "MUSIC",
            "KARAOKE",
            "PREVIEW",
            "RECORDING",
            "VOCAL",
            "INSTRUMENTAL",
            "OTHER",
          )
          .optional(),
      }).unknown(true);

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      // 4. Locate the audio file (support 'fileData' or 'file' field)
      const audioFile = files?.find(
        (f) => f.fieldname === "fileData" || f.fieldname === "file",
      );
      if (!audioFile && !value.musicFileId) {
        return res.status(400).json({
          message: "Audio file or musicFileId is required",
        });
      }

      let fileId = value.musicFileId;
      let fileUrl = null;

      // 5. Upload Audio File to MusicLibrary if provided
      if (audioFile) {
        const fileRecord = await MusicLibrarySvc.uploadMusicFile(
          audioFile.buffer,
          audioFile.originalname,
          audioFile.mimetype,
          undefined,
          value.fileType || (value.isKaraoke ? "KARAOKE" : "MUSIC"),
        );
        fileId = fileRecord.id;
        fileUrl = fileRecord.fileUrl;
      }

      // 6. Create Music using the new or existing file ID
      const music = await MusicSvc.createMusic({
        ...value,
        musicFileId: fileId,
        metaData: value.meta_data,
        ownerId: req.user.id,
      });

      // 7. Trigger Media Optimization in Background
      if (fileUrl) {
        try {
          await MediaQueueSvc.publishJob({
            jobType: "optimize_audio",
            inputUrl: fileUrl,
            outputKeyPrefix: `music/${music.id}`,
            mediaId: music.id,
          });
          logger.info(`[MusicCtrl] Queued optimization for music ${music.id}`);
        } catch (e) {
          logger.warn(`[MusicCtrl] Failed to queue optimization: ${e}`);
        }
      }

      return res.status(201).json({
        message: fileUrl 
          ? "Music created successfully with files and queued for optimization"
          : "Music created successfully with existing file",
        data: music,
      });
    } catch (error: any) {
      console.error("[MusicCtrl] Error in createMusicWithFiles:", error);
      return res.status(500).json({ message: error.message || error });
    }
  }
}
