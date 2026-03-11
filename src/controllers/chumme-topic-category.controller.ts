import { Request, Response } from "express";
import Joi from "joi";
import ChummeTopicCategorySvc from "../services/chumme-topic-category.service";

export default class ChummeTopicCategoryCtrl {
  /**
   * Create a new chumme topic category
   */
  static async createTopicCategory(req: Request, res: Response) {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      chummeSubCategoryId: Joi.string().uuid().required(),
      isAd: Joi.boolean().required(),
      keyPassword: Joi.string().allow(null, "").optional(),
      traits: Joi.string().valid("NONE", "COMMUNITIES", "ENTERTAINMENT").optional(),
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
      const topicCategory = await ChummeTopicCategorySvc.createTopicCategory(value);
      return res.status(201).json({
        message: "Chumme topic category created successfully",
        topicCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get all chumme topic categories
   */
  static async getAllTopicCategories(req: Request, res: Response) {
    const { subCategoryId, publicOnly } = req.query as any;
    try {
      const topicCategories = await ChummeTopicCategorySvc.getAllTopicCategories({
        subCategoryId,
        publicOnly: publicOnly === "true",
      });

      return res.json({ topicCategories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get chumme topic category by ID
   */
  static async getTopicCategoryById(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const topicCategory = await ChummeTopicCategorySvc.getTopicCategoryById(id);
      return res.json({ topicCategory });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  /**
   * Update chumme topic category
   */
  static async updateTopicCategory(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      chummeSubCategoryId: Joi.string().uuid().optional(),
      isAd: Joi.boolean().optional(),
      keyPassword: Joi.string().allow(null, "").optional(),
      traits: Joi.string().valid("NONE", "COMMUNITIES", "ENTERTAINMENT").optional(),
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
      const topicCategory = await ChummeTopicCategorySvc.updateTopicCategory(id, value);
      return res.json({
        message: "Chumme topic category updated successfully",
        topicCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Delete chumme topic category
   */
  static async deleteTopicCategory(req: Request, res: Response) {
    const { id } = req.params;

    try {
      await ChummeTopicCategorySvc.deleteTopicCategory(id);
      return res.json({ message: "Chumme topic category deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
