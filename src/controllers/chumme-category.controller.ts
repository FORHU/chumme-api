import { Request, Response } from "express";
import Joi from "joi";
import ChummeCategorySvc from "../services/chumme-category.service";
import ChummeCategoriesConsts from "../constants/chumme-categories.constants";
import CircleAccessSvc from "../services/circle-access.service";
import { io } from "../app";

// A PRIVATE Circle's code: 6 characters, A–Z and 0–9 (the app generates it)
const CIRCLE_CODE = /^[A-Z0-9]{6}$/;

export default class ChummeCategoryCtrl {
  /**
   * Create a new chumme category
   */
  static async createCategory(req: Request, res: Response) {
    if (!req.body.traits) {
      return res.status(400).json({ message: "Trait is required" });
    }
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      isAd: Joi.boolean().required(),
      visibility: Joi.string()
        .valid("PUBLIC", "PRIVATE", "PERSONAL")
        .default("PUBLIC"),
      keyPassword: Joi.when("visibility", {
        is: "PRIVATE",
        then: Joi.string()
          .trim()
          .uppercase()
          .pattern(CIRCLE_CODE)
          .required()
          .messages({
            "any.required": "A private Circle needs a code",
            "string.empty": "A private Circle needs a code",
            "string.pattern.base": "The code must be 6 letters or numbers",
          }),
        otherwise: Joi.string().allow(null, "").optional(), // Legacy: non-empty = password-protected
      }),
      // The owner is always the signed-in user, never the body
      ownerId: Joi.any().strip(),
      traits: Joi.string()
        .valid("NONE", "COMMUNITIES", "ENTERTAINMENT")
        .optional(),
      position: Joi.object().optional(),
      colorSet: Joi.object().optional(),
      sizeSet: Joi.object().optional(),
      border: Joi.object().optional(),
      shadow: Joi.object().optional(),
      opacity: Joi.number().min(0).max(1).optional(),
      capacity: Joi.number().integer().min(1).optional(),
      status: Joi.string().optional(),
      metaData: Joi.object().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      emojiIcon: Joi.string().allow("").optional(),
      aiChatEnabled: Joi.boolean().optional(),
      discoveryEnabled: Joi.boolean().optional(),
      note: Joi.string().max(500).optional(),
      channelId: Joi.array().items(Joi.string()).optional(),
      // Where the category sits on the Circles globe. Stored free-form (the
      // seeders use ISO-3166 alpha-2); without it Prisma defaults to [] and the
      // client has to scatter the circle to an arbitrary coordinate.
      targetCountries: Joi.array().items(Joi.string().trim().min(2)).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      // Map `traits` (API field) → `chummeTraits` (service/DB field)
      const { traits, ...rest } = value;
      const category = await ChummeCategorySvc.createCategory({
        ...rest,
        ownerId: (req as any).user.id,
        chummeTraits: traits,
      });

      io.emit("category_created", CircleAccessSvc.toBroadcast(category));

      return res.status(201).json({
        message: "Chumme category created successfully",
        category,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  static async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await ChummeCategorySvc.getAllCategories({
        userId: (req as any).user.id,
      });

      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get chumme category by ID
   */
  static async getCategoryById(req: Request, res: Response) {
    const { id } = req.params;
    const { trait } = req.query;

    const schema = Joi.object({
      id: Joi.string().required(),
      trait: Joi.string()
        .valid("COMMUNITIES", "ENTERTAINMENT")
        .optional()
        .allow(null, ""),
    });

    const { error } = schema.validate({
      id,
      trait: (trait as string) || undefined,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await ChummeCategorySvc.getCategoryById(
        id,
        (trait as any) || undefined,
        (req as any).user.id,
      );
      return res.json({ category });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  /**
   * Update chumme category
   */
  static async updateCategory(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      isAd: Joi.boolean().optional(),
      keyPassword: Joi.string().allow(null, "").optional(), // Null/Empty = public, otherwise private
      traits: Joi.string()
        .valid("NONE", "COMMUNITIES", "ENTERTAINMENT")
        .optional(),

      position: Joi.object().optional(),
      colorSet: Joi.object().optional(),
      sizeSet: Joi.object().optional(),
      border: Joi.object().optional(),
      shadow: Joi.object().optional(),
      opacity: Joi.number().min(0).max(1).optional(),
      capacity: Joi.number().integer().min(1).optional(),
      status: Joi.string().optional(),
      metaData: Joi.object().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      emojiIcon: Joi.string().allow("").optional(),
      aiChatEnabled: Joi.boolean().optional(),
      discoveryEnabled: Joi.boolean().optional(),
      note: Joi.string().max(500).optional(),
      channelId: Joi.array().items(Joi.string()).optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      // Map `traits` (API field) → `chummeTraits` (service/DB field)
      const { traits, ...rest } = value;
      const category = await ChummeCategorySvc.updateCategory(
        id,
        (req as any).user.id,
        {
          ...rest,
          ...(traits && { chummeTraits: traits }),
        },
      );

      io.emit("category_updated", CircleAccessSvc.toBroadcast(category));

      return res.json({
        message: "Chumme category updated successfully",
        category,
      });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Delete chumme category
   */
  static async deleteCategory(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await ChummeCategorySvc.deleteCategory(id, (req as any).user.id);

      io.emit("category_deleted", { id });

      return res.json({ message: "Chumme category deleted successfully" });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Get all subcategories in a category
   */
  static async getSubCategoriesInCategory(req: Request, res: Response) {
    const { categoryId } = req.params;
    const { password } = req.query; // Category password could be provided via query

    const schema = Joi.object({
      categoryId: Joi.string().required(),
      password: Joi.string().allow(null, "").optional(),
    });

    const { error } = schema.validate({
      categoryId,
      password: (password as string) || undefined,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategories = await ChummeCategorySvc.getSubCategoriesInCategory(
        categoryId,
        (req as any).user.id,
        (password as string) || undefined,
      );
      return res.json({ subCategories, count: subCategories.length });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Enter a PRIVATE Circle's code to get access
   */
  static async joinCategory(req: Request, res: Response) {
    const schema = Joi.object({
      id: Joi.string().required(),
      keyPassword: Joi.string().trim().required().messages({
        "any.required": "Enter the Circle's code",
        "string.empty": "Enter the Circle's code",
      }),
    });

    const { error, value } = schema.validate({
      id: req.params.id,
      keyPassword: req.body?.keyPassword,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await CircleAccessSvc.joinWithCode(
        value.id,
        (req as any).user.id,
        value.keyPassword,
      );
      return res.json({ message: "You're in", hasAccess: true });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Owner: list the users granted access
   */
  static async getCategoryAccess(req: Request, res: Response) {
    try {
      const users = await CircleAccessSvc.listGrantedUsers(
        req.params.id,
        (req as any).user.id,
      );
      return res.json({ users });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Owner: grant a user access by username
   */
  static async grantCategoryAccess(req: Request, res: Response) {
    const schema = Joi.object({
      username: Joi.string().trim().min(1).required().messages({
        "any.required": "Enter a username",
        "string.empty": "Enter a username",
      }),
    });

    const { error, value } = schema.validate({
      username: req.body?.username,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await CircleAccessSvc.grantByUsername(
        req.params.id,
        (req as any).user.id,
        value.username,
      );
      return res.status(201).json({ message: "Access granted" });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Owner: remove a user's access
   */
  static async revokeCategoryAccess(req: Request, res: Response) {
    try {
      await CircleAccessSvc.revoke(
        req.params.id,
        (req as any).user.id,
        req.params.userId,
      );
      return res.json({ message: "Access removed" });
    } catch (error: any) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message || error });
    }
  }

  /**
   * Bulk delete subcategories in a category
   */
  static async bulkDeleteSubCategories(req: Request, res: Response) {
    const { categoryId } = req.params;
    const { ids } = req.body;

    const schema = Joi.object({
      categoryId: Joi.string().required(),
      ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
    });

    const { error } = schema.validate({ categoryId, ids });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await ChummeCategorySvc.bulkDeleteSubCategories(
        req.params.categoryId,
        req.body.ids,
      );
      return res.json({
        message: `${result.count} subcategories deleted successfully`,
        deletedCount: result.count,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get specialized categories based on trait (COMMUNITIES or ENTERTAINMENT)
   */
  static async getSpecializedCategories(req: Request, res: Response) {
    const { trait } = req.params;

    if (!ChummeCategoriesConsts.CHUMME_TRAITS.includes(trait)) {
      return res.status(400).json({
        message: `Invalid trait: ${trait}`,
      });
    }

    try {
      const categories = await ChummeCategorySvc.getSpecializedCategories(
        trait as any,
        (req as any).user.id,
      );
      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get all entertainment categories
   */
  static async getChummeEntertainment(req: Request, res: Response) {
    try {
      const categories = await ChummeCategorySvc.getChummeEntertainment(
        (req as any).user.id,
      );
      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get all communities categories
   */
  static async getChummeCommunities(req: Request, res: Response) {
    try {
      const categories = await ChummeCategorySvc.getChummeCommunities(
        (req as any).user.id,
      );
      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
