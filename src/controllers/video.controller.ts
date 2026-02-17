import { Request, Response } from "express";
import Joi from "joi";
import VideoSvc from "../services/video.service";
import VideoLibrarySvc from "../services/video-library.service";
import FileSvc from "../services/file.service";
import MediaQueueSvc from "../services/media-queue.service";
import { fetchVideosByEmotion } from "../utils/chat-wonder/fetch-video-by-emotion.util";
import logger from "../utils/logger";

const allowedPlatforms = ["YOUTUBE", "FACEBOOK", "INSTAGRAM", "TIKTOK"];

export default class VideoCtrl {
  static async saveVideo(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        title: Joi.string().required(),
        fileId: Joi.string().uuid().required(),
        platform: Joi.string()
          .valid(...allowedPlatforms)
          .required(),
        artistId: Joi.string().uuid().optional(),
        meta_data: Joi.any().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const video = await VideoSvc.saveVideo({
        title: value.title,
        fileId: value.fileId,
        platform: value.platform,
        artistId: value.artistId,
        meta_data: value.meta_data,
      });

      // Trigger Media Processing in Background
      try {
        const file = await FileSvc.getFileById(value.fileId);
        if (file && file.fileUrl) {
          await MediaQueueSvc.publishJob({
            jobType: "optimize_video",
            inputUrl: file.fileUrl,
            outputKeyPrefix: `videos/${video.id}`,
            mediaId: video.id,
          });
          await MediaQueueSvc.publishJob({
            jobType: "generate_hls",
            inputUrl: file.fileUrl,
            outputKeyPrefix: `videos/${video.id}`,
            mediaId: video.id,
          });
          logger.info(
            `[VideoCtrl] Queued optimization and HLS for video ${video.id}`,
          );
        }
      } catch (e) {
        logger.warn(`[VideoCtrl] Failed to queue media processing: ${e}`);
      }

      return res
        .status(201)
        .json({ message: "Video saved and processing queued", video });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async upsertVideo(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        externalUrl: Joi.string().uri().required(),
        title: Joi.string().required(),
        fileId: Joi.string().uuid().required(),
        platform: Joi.string()
          .valid(...allowedPlatforms)
          .required(),
        artistId: Joi.string().uuid().optional(),
        meta_data: Joi.any().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const { video, isUpdate } = await VideoSvc.upsertVideo({
        externalUrl: value.externalUrl,
        title: value.title,
        fileId: value.fileId,
        platform: value.platform,
        artistId: value.artistId,
        meta_data: value.meta_data,
      });

      // Trigger Media Processing for new videos
      if (!isUpdate) {
        try {
          const file = await FileSvc.getFileById(value.fileId);
          if (file && file.fileUrl) {
            await MediaQueueSvc.publishJob({
              jobType: "optimize_video",
              inputUrl: file.fileUrl,
              outputKeyPrefix: `videos/${video.id}`,
              mediaId: video.id,
            });
            await MediaQueueSvc.publishJob({
              jobType: "generate_hls",
              inputUrl: file.fileUrl,
              outputKeyPrefix: `videos/${video.id}`,
              mediaId: video.id,
            });
            logger.info(
              `[VideoCtrl] Queued processing for new upserted video ${video.id}`,
            );
          }
        } catch (e) {
          logger.warn(
            `[VideoCtrl] Failed to queue media processing for upsert: ${e}`,
          );
        }
      }

      const message = isUpdate
        ? "Video updated"
        : "Video created and processing queued";
      const statusCode = isUpdate ? 200 : 201;

      return res.status(statusCode).json({ message, video });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
  static async findByEmotion(req: Request, res: Response) {
    try {
      const { emotions, limit } = req.query;
      const videoLimit = Number(limit);
      const videos = await fetchVideosByEmotion(
        emotions as string[],
        "",
        videoLimit,
      );
      return res.status(200).json({ videos });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async uploadVideo(req: Request, res: Response) {
    try {
      // 2. Locate the video file
      const videoFile = req.file;
      if (!videoFile) {
        return res.status(400).json({ message: "Video file is required" });
      }

      // 3. Handle MetaData parsing (consistent with MusicCtrl)
      const files = req.files as Express.Multer.File[]; // If using any()
      const metaFile = files?.find(
        (f) => f.fieldname === "meta_data" || f.fieldname === "metaData",
      );

      if (metaFile) {
        try {
          req.body.meta_data = JSON.parse(metaFile.buffer.toString("utf-8"));
        } catch (e) {
          logger.warn("[VideoCtrl] Failed to parse meta_data file", e);
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
        platform: Joi.string()
          .valid(...allowedPlatforms)
          .required(),
        artistId: Joi.string().uuid().optional().allow(null, ""),
        meta_data: Joi.any().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      // 4. Handle empty UUID strings
      if (value.artistId === "") value.artistId = null;

      // 5. Upload Video File to VideoLibrary
      const fileRecord = await VideoLibrarySvc.uploadVideoFile(
        videoFile.buffer,
        videoFile.originalname,
        videoFile.mimetype,
        value.meta_data,
      );

      // 6. Create Video Record
      const video = await VideoSvc.saveVideo({
        title: value.title,
        platform: value.platform,
        artistId: value.artistId,
        meta_data: value.meta_data,
        fileId: fileRecord.id,
      });

      // Trigger Media Processing in Background
      try {
        if (fileRecord.fileUrl) {
          await MediaQueueSvc.publishJob({
            jobType: "optimize_video",
            inputUrl: fileRecord.fileUrl,
            outputKeyPrefix: `videos/${video.id}`,
            mediaId: video.id,
          });
          await MediaQueueSvc.publishJob({
            jobType: "generate_hls",
            inputUrl: fileRecord.fileUrl,
            outputKeyPrefix: `videos/${video.id}`,
            mediaId: video.id,
          });
          logger.info(
            `[VideoCtrl] Queued optimization and HLS for uploaded video ${video.id}`,
          );
        }
      } catch (e) {
        logger.warn(
          `[VideoCtrl] Failed to queue media processing for upload: ${e}`,
        );
      }

      return res.status(201).json({
        message: "Video uploaded and processing queued",
        video,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
