import { Request, Response } from "express";
import Joi from "joi";
import MusicStudioSvc from "../services/music-studio.service";

export default class MusicStudioCtrl {
  /**
   * Create a new music studio
   */
  static async createStudio(req: Request, res: Response) {
    const schema = Joi.object({
      name: Joi.string().required(),
      keyName: Joi.string(), // Optional - if not set, studio is public
      note: Joi.string(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicStudioSvc.createStudio({
        ...value,
        ownerId: (req as any).user.id,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Get a studio by ID
   */
  static async getStudioById(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await MusicStudioSvc.getStudioById(id);
      return res.json(result);
    } catch (err: any) {
      return res.status(404).json({ message: err.message || err });
    }
  }

  /**
   * Get all studios with pagination
   */
  static async getStudios(req: Request, res: Response) {
    const { page, limit } = req.query;

    try {
      const result = await MusicStudioSvc.getAllStudios(
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Get studios owned by current user
   */
  static async getMyStudios(req: Request, res: Response) {
    try {
      const result = await MusicStudioSvc.getStudiosByOwner(
        (req as any).user.id,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Get studios user has joined
   */
  static async getJoinedStudios(req: Request, res: Response) {
    try {
      const result = await MusicStudioSvc.getStudiosByUser(
        (req as any).user.id,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Join a studio
   */
  static async joinStudio(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      keyName: Joi.string(), // Optional for public studios
      role: Joi.string().valid("LISTENER", "SINGER", "PRODUCER"),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicStudioSvc.joinStudio(
        id,
        (req as any).user.id,
        value.keyName,
        value.role,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * Leave a studio
   */
  static async leaveStudio(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await MusicStudioSvc.leaveStudio(id, (req as any).user.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * Get users in a studio
   */
  static async getStudioUsers(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await MusicStudioSvc.getStudioUsers(id);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || err });
    }
  }

  /**
   * Update a member's role (owner/producer only)
   */
  static async updateMemberRole(req: Request, res: Response) {
    const { id, userId } = req.params;
    const schema = Joi.object({
      role: Joi.string().valid("LISTENER", "SINGER", "PRODUCER").required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicStudioSvc.updateMemberRole(
        id,
        (req as any).user.id,
        userId,
        value.role,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * Update studio details (owner only)
   */
  static async updateStudio(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string(),
      note: Joi.string().allow("", null),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const result = await MusicStudioSvc.updateStudio(
        id,
        (req as any).user.id,
        value,
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  /**
   * Close/delete a studio (owner only)
   */
  static async closeStudio(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await MusicStudioSvc.closeStudio(id, (req as any).user.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
