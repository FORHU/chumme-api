import { Request, Response } from "express";
import Joi from "joi";
import RoomSubCategorySvc from "../services/room-subcategory.service";

export default class RoomSubCategoryCtrl {
  /**
   * Create a new room subcategory
   */
  static async createSubCategory(req: Request, res: Response) {
    const { name, roomCategoryId, note } = req.body;

    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      roomCategoryId: Joi.string().uuid().required(),
      note: Joi.string().max(500).optional(),
    });

    const { error } = schema.validate({ name, roomCategoryId, note });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategory = await RoomSubCategorySvc.createSubCategory(
        name,
        roomCategoryId,
        note
      );
      return res.status(201).json({
        message: "Room subcategory created successfully",
        subCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get all room subcategories
   * Optional query param: categoryId to filter by category
   */
  static async getAllSubCategories(req: Request, res: Response) {
    const categoryId = req.query.categoryId as string | undefined;

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
      const subCategories =
        await RoomSubCategorySvc.getAllSubCategories(categoryId);
      return res.json({ subCategories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get room subcategory by ID
   */
  static async getSubCategoryById(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const subCategory = await RoomSubCategorySvc.getSubCategoryById(id);
      return res.json({ subCategory });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  /**
   * Update room subcategory
   */
  static async updateSubCategory(req: Request, res: Response) {
    const { id } = req.params;
    const { name, roomCategoryId, note } = req.body;

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().min(1).max(100).optional(),
      roomCategoryId: Joi.string().uuid().optional(),
      note: Joi.string().max(500).optional(),
    });

    const { error } = schema.validate({ id, name, roomCategoryId, note });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // At least one field must be provided
    if (!name && !roomCategoryId && note === undefined) {
      return res.status(400).json({
        message:
          "At least one field (name, roomCategoryId, or note) must be provided",
      });
    }

    try {
      const subCategory = await RoomSubCategorySvc.updateSubCategory(id, {
        name,
        roomCategoryId,
        note,
      });
      return res.json({
        message: "Room subcategory updated successfully",
        subCategory,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Delete room subcategory
   */
  static async deleteSubCategory(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      await RoomSubCategorySvc.deleteSubCategory(id);
      return res.json({ message: "Room subcategory deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
