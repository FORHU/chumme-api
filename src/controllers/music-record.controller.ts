import { Request, Response } from "express";
import Joi from "joi";
import MusicRecordSvc from "../services/music-record.service";

/** 403/404 from the service keep their status; anything else is a 400. */
const fail = (res: Response, err: any) =>
  res.status(err?.statusCode || 400).json({ message: err?.message || err });

export default class MusicRecordCtrl {
  /**
   * POST /music-records
   * Create a new music recording
   */
  static async create(req: Request, res: Response) {
    const schema = Joi.object({
      studioId: Joi.string().uuid().required(),
      musicId: Joi.string().uuid().required(),
      fileId: Joi.string().uuid(),
      file: Joi.object({
        filename: Joi.string().optional(),
        fileUrl: Joi.string().uri().optional(),
        meta_data: Joi.object().optional(),
      }).optional(),
      singerIds: Joi.array().items(Joi.string().uuid()).optional(),
      meta_data: Joi.object().optional(),
    }).or("fileId", "file");

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await MusicRecordSvc.create(
        {
          ...value,
          metaData: value.meta_data,
          file: value.file
            ? {
                ...value.file,
                metaData: value.file.meta_data,
              }
            : undefined,
        },
        req.user,
      );
      return res.status(201).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  /**
   * GET /music-records/:id
   * Get a single music record by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MusicRecordSvc.getById(id, req.user);
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  /**
   * GET /music-records/list
   * The caller's music records with pagination
   */
  static async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getAll(req.user, page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  /**
   * GET /music-records/studio/:studioId
   * The caller's music records made in a specific studio
   */
  static async getByStudioId(req: Request, res: Response) {
    try {
      const { studioId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getByStudioId(
        studioId,
        req.user,
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  /**
   * GET /music-records/music/:musicId
   * The caller's recordings of a specific song
   */
  static async getByMusicId(req: Request, res: Response) {
    try {
      const { musicId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getByMusicId(
        musicId,
        req.user,
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  /**
   * DELETE /music-records/:id
   * Soft delete a music record
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await MusicRecordSvc.delete(id, req.user);
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async getMusicByUserId(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await MusicRecordSvc.getByUserId(
        userId,
        req.user,
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (err: any) {
      return fail(res, err);
    }
  }
}
