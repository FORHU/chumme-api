import { Request, Response } from "express";
import Joi from "joi";
import MediaQueueSvc from "../services/media-queue.service";
import * as MediaUtils from "../utils/media.utils";
import logger from "../utils/logger";

export default class MediaCtrl {
  /**
   * Triggers a media processing job (Optimization or HLS)
   * POST /api/v1/media/process
   */
  static async processMedia(req: Request, res: Response) {
    const schema = Joi.object({
      jobType: Joi.string().valid("optimize_video", "generate_hls").required(),
      inputUrl: Joi.string().uri().required(),
      outputKeyPrefix: Joi.string().required(),
      mediaId: Joi.string().optional(),
      resolution: Joi.string().valid("1080p", "720p", "480p").optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      await MediaQueueSvc.publishJob(value);
      return res.status(202).json({
        message: `Job ${value.jobType} queued for processing`,
        mediaId: value.mediaId,
      });
    } catch (err: any) {
      logger.error("[MediaCtrl] Error publishing job:", err);
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Retrieves metadata for a media file
   * GET /api/v1/media/metadata?url=...
   */
  static async getMetadata(req: Request, res: Response) {
    const { url } = req.query;
    if (!url) {
      return res
        .status(400)
        .json({ message: "URL is required as query param" });
    }

    try {
      const metadata = await MediaUtils.getMediaMetadata(url as string);
      return res.json(metadata);
    } catch (err: any) {
      logger.error("[MediaCtrl] Error getting metadata:", err);
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Generates a thumbnail for a video and returns it as an image
   * GET /api/v1/media/thumbnail?url=...&timestamp=1
   */
  static async getThumbnail(req: Request, res: Response) {
    const { url, timestamp } = req.query;
    if (!url) {
      return res
        .status(400)
        .json({ message: "URL is required as query param" });
    }

    try {
      const buffer = await MediaUtils.generateThumbnail(
        url as string,
        timestamp ? Number(timestamp) : undefined,
      );
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(buffer);
    } catch (err: any) {
      logger.error("[MediaCtrl] Error generating thumbnail:", err);
      return res.status(500).json({ message: err.message || err });
    }
  }
}
