import { Request, Response } from "express";
import Joi from "joi";
import OnboardingSvc from "../services/onboarding.service";
import { BadRequestError } from "../utils/error.util";

export default class OnboardingCtrl {
  static async getStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const status = await OnboardingSvc.getStatus(userId);
      return res.json(status);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Failed to load onboarding status" });
    }
  }

  /**
   * Step: categories / subcategories / optional topic categories (onboarding wrapper around social-discovery).
   */
  static async saveDiscovery(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const schema = Joi.object({
        categoryIds: Joi.array()
          .items(Joi.string().uuid())
          .required()
          .min(2),
        subCategoryIds: Joi.array()
          .items(Joi.string().uuid())
          .required()
          .min(3),
        topicCategoryIds: Joi.array()
          .items(Joi.string().uuid())
          .optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const discovery = await OnboardingSvc.saveDiscovery(userId, value);
      return res.json({
        message: "Discovery preferences saved for onboarding",
        discovery,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Failed to save discovery" });
    }
  }

  static async connectGoogle(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const schema = Joi.object({
        idToken: Joi.string().allow(null).optional(),
        accessToken: Joi.string().allow(null).optional(),
      }).or("idToken", "accessToken");

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await OnboardingSvc.connectGoogle(
        userId,
        value.idToken,
        value.accessToken,
      );

      return res.json({
        message: "Google connected successfully during onboarding",
        data: result,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Failed to connect Google account" });
    }
  }

  static async complete(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const result = await OnboardingSvc.complete(userId);
      return res.json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      return res
        .status(500)
        .json({ message: error.message || "Failed to complete onboarding" });
    }
  }
}
