import { Request, Response } from "express";
import Joi from "joi";
import VideoSvc from "../services/video.service";
import { fetchVideosByEmotion } from "../utils/chat-wonder/fetch-video-by-emotion.util";

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

      return res.status(201).json({ message: "Video saved", video });
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

      const message = isUpdate ? "Video updated" : "Video created";
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
}
