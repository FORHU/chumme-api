import { Request, Response } from "express";
import Joi from "joi";
import RoomCategorySvc from "../services/room-category.service";

export default class RoomCategoryCtrl {
  /**
   * Create a new room category
   */
  static async createCategory(req: Request, res: Response) {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      isAd: Joi.boolean().required(),
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
      keyName: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await RoomCategorySvc.createCategory(value);
      return res.status(201).json({
        message: "Room category created successfully",
        category,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get all room categories
   */
  static async getAllCategories(req: Request, res: Response) {
    try {
      // const categories = await RoomCategorySvc.getAllCategories();
      const categories = await RoomCategorySvc.getAllCategory();

      return res.json({ categories });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get room category by ID
   */
  static async getCategoryById(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await RoomCategorySvc.getCategoryById(id);
      return res.json({ category });
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  /**
   * Update room category
   */
  static async updateCategory(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      isAd: Joi.boolean().optional(),
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
      keyName: Joi.string().optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const category = await RoomCategorySvc.updateCategory(id, value);
      return res.json({
        message: "Room category updated successfully",
        category,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Delete room category
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
      await RoomCategorySvc.deleteCategory(id);
      return res.json({ message: "Room category deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Get all rooms in a category
   */
  static async getRoomsInCategory(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const rooms = await RoomCategorySvc.getRoomsInCategory(id);
      return res.json({ rooms, count: rooms.length });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  /**
   * Bulk delete rooms in a category
   */
  static async bulkDeleteRooms(req: Request, res: Response) {
    const { id } = req.params;
    const { roomIds } = req.body;

    const schema = Joi.object({
      id: Joi.string().required(),
      roomIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    });

    const { error } = schema.validate({ id, roomIds });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await RoomCategorySvc.bulkDeleteRooms(id, roomIds);
      return res.json({
        message: `${result.count} rooms deleted successfully`,
        deletedCount: result.count,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }
}
