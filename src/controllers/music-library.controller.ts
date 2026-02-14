import MusicLibrarySvc from "../services/music-library.service";
import { Request, Response } from "express";

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
}
