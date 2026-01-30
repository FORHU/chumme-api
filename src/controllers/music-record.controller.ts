import { Request, Response } from "express";
import MusicRecordSvc from "../services/music-record.service";

export default class MusicRecordCtrl {
  /**
   * POST /music-records
   * Create a new music recording
   */
  static async create(req: Request, res: Response) {
    try {
      const { userIds, musicId, fileId } = req.body;

      if (!userIds || !musicId || !fileId) {
        return res
          .status(400)
          .json({
            message: "userIds (array), musicId, and fileId are required",
          });
      }

      const result = await MusicRecordSvc.create({ userIds, musicId, fileId });
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * GET /music-records/:id
   * Get a single music record by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MusicRecordSvc.getById(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "Music record not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  /**
   * GET /music-records/list
   * Get all music records with pagination
   */
  static async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getAll(page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * GET /music-records/user/:userId
   * Get all music records by a specific user
   */
  static async getByUserId(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getByUserId(userId, page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * GET /music-records/music/:musicId
   * Get all recordings of a specific song
   */
  static async getByMusicId(req: Request, res: Response) {
    try {
      const { musicId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getByMusicId(musicId, page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * DELETE /music-records/:id
   * Soft delete a music record
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MusicRecordSvc.delete(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "Music record not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }
}
