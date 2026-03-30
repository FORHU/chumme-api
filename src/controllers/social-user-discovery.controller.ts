import { Request, Response } from "express";
import Joi from "joi";
import SocialUserDiscoverySvc from "../services/social-user-discovery.service";

export default class SocialUserDiscoveryCtrl {
  /**
   * Get user's discovery preferences
   */
  static async getDiscovery(req: Request, res: Response) {
    const userId = (req as any).user.id;
    try {
      const discovery = await SocialUserDiscoverySvc.getDiscovery(userId);
      return res.json({ discovery });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Update category-based discovery settings
   */
  static async updateDiscovery(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const schema = Joi.object({
      categoryIds: Joi.array().items(Joi.string().uuid()).required().min(2),
      subCategoryIds: Joi.array().items(Joi.string().uuid()).required().min(3),
      topicCategoryIds: Joi.any().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const discovery = await SocialUserDiscoverySvc.updateDiscovery(
        userId,
        value,
      );
      return res.json({
        message: "Discovery updated successfully",
        discovery,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
