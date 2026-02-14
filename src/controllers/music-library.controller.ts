import MusicLibrarySvc from "../services/music-library.service";
import { Request, Response } from "express";
import Joi from "joi";

export default class MusicLibraryCtrl {
  static async uploadMusicFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = await MusicLibrarySvc.uploadMusicFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      return res.status(201).json({
        message: "Music file uploaded successfully",
        file,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getMusicFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = await MusicLibrarySvc.getMusicFileById(id);
      return res.status(200).json({ file });
    } catch (err: any) {
      const statusCode = err.message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async deleteMusicFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MusicLibrarySvc.deleteMusicFile(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async saveMusicFile(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        filename: Joi.string().optional(),
        fileUrl: Joi.string().uri().optional(),
      })
        .or("filename", "fileUrl")
        .messages({
          "object.missing":
            "Provide either filename or fileUrl in the request body",
        });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const file = await MusicLibrarySvc.saveMusicFile({
        filename: value.filename,
        fileUrl: value.fileUrl,
      });
      return res
        .status(201)
        .json({ message: "Music library record saved", file });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getUploadUrl(req: Request, res: Response) {
    try {
      const { key, contentType } = req.body;
      if (!key || !contentType) {
        return res
          .status(400)
          .json({ message: "key and contentType are required in the body" });
      }

      const result = await MusicLibrarySvc.getUploadUrl(key, contentType);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getDownloadUrl(req: Request, res: Response) {
    try {
      const { key } = req.query;
      if (!key) {
        return res
          .status(400)
          .json({ message: "key is required in query parameters" });
      }

      const result = await MusicLibrarySvc.getDownloadUrl(key as string);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
