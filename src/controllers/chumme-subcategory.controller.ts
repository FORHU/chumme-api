import { Request, Response } from "express";
import Joi from "joi";
import ChummeSubCategorySvc from "../services/chumme-subcategory.service";

export default class ChummeSubCategoryCtrl {
  /**
   * Create a new chumme subcategory
   */
  static async createSubCategory(req: Request, res: Response) {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      chummeCategoryId: Joi.string().uuid().required(),
      ownerId: Joi.string().uuid().optional(),
      isAd: Joi.boolean().required(),
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
      note: Joi.string().max(500).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategory = await ChummeSubCategorySvc.createSubCategory(value);
      return res.status(201).json({
        message: "Chumme subcategory created successfully",
        subCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get all chumme subcategories
   * Optional query param: categoryId to filter by category
   */
  static async getAllSubCategories(req: Request, res: Response) {
    const { categoryId, publicOnly } = req.query as any;

    if (categoryId) {
      const schema = Joi.object({
        categoryId: Joi.string().uuid().required(),
      });

      const { error } = schema.validate({ categoryId });
      if (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    try {
      const subCategories = await ChummeSubCategorySvc.getAllSubCategories({
        categoryId: categoryId as string,
        publicOnly: publicOnly === "true",
      });
      return res.json({ subCategories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get chumme subcategory by ID
   */
  static async getSubCategoryById(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategory = await ChummeSubCategorySvc.getSubCategoryById(id);
      return res.json({ subCategory });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  /**
   * Get subcategories strictly by a parent chumme category ID
   */
  static async getChummeSubCategoryByChummeCategoryID(
    req: Request,
    res: Response,
  ) {
    const { categoryId } = req.params;

    const schema = Joi.object({
      categoryId: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ categoryId });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategories =
        await ChummeSubCategorySvc.getChummeSubCategoryByChummeCategoryID(
          categoryId,
        );
      return res.json({ subCategories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Update chumme subcategory
   */
  static async updateSubCategory(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      chummeCategoryId: Joi.string().uuid().optional(),
      ownerId: Joi.string().uuid().optional(),
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
      note: Joi.string().max(500).optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategory = await ChummeSubCategorySvc.updateSubCategory(
        id,
        value,
      );
      return res.json({
        message: "Chumme subcategory updated successfully",
        subCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Delete chumme subcategory
   */
  static async deleteSubCategory(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await ChummeSubCategorySvc.deleteSubCategory(id);
      return res.json({ message: "Chumme subcategory deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
