import { Request, Response } from "express";
import Joi from "joi";
import ChummeCategorySvc from "../services/chumme-category.service";
import ChummeCategoriesConsts from "../constants/chumme-categories.constants";

export default class ChummeCategoryCtrl {
  /**
   * Create a new chumme category
   */
  static async createCategory(req: Request, res: Response) {
    if (!req.body.chummeTrait) {
      return res.status(400).json({ message: "Trait is required" });
    }
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      isAd: Joi.boolean().required(),
      keyPassword: Joi.string().allow(null, "").optional(), // Null/Empty = public, otherwise private
      chummeTrait: Joi.string()
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
      note: Joi.string().max(500).optional(),
      discoveryKeywords: Joi.array().items(Joi.string()).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await ChummeCategorySvc.createCategory(value);
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
      const categories = await ChummeCategorySvc.getAllCategories();

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
    const { chummeTrait } = req.query;

    const schema = Joi.object({
      id: Joi.string().required(),
      chummeTrait: Joi.string()
        .valid("COMMUNITIES", "ENTERTAINMENT")
        .optional()
        .allow(null, ""),
    });

    const { error } = schema.validate({
      id,
      chummeTrait: (chummeTrait as string) || undefined,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await ChummeCategorySvc.getCategoryById(
        id,
        (chummeTrait as any) || undefined,
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
      chummeTrait: Joi.string()
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
      note: Joi.string().max(500).optional(),
      discoveryKeywords: Joi.array().items(Joi.string()).optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await ChummeCategorySvc.updateCategory(id, value);
      return res.json({
        message: "Chumme category updated successfully",
        category,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
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
      await ChummeCategorySvc.deleteCategory(id);
      return res.json({ message: "Chumme category deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
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
        (password as string) || undefined,
      );
      return res.json({ subCategories, count: subCategories.length });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
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
    const { chummeTrait } = req.params;

    if (!ChummeCategoriesConsts.CHUMME_TRAITS.includes(chummeTrait)) {
      return res.status(400).json({
        message: `Invalid trait: ${chummeTrait}`,
      });
    }

    try {
      const categories = await ChummeCategorySvc.getSpecializedCategories(
        chummeTrait as any,
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
      const categories = await ChummeCategorySvc.getChummeEntertainment();
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
      const categories = await ChummeCategorySvc.getChummeCommunities();
      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
