import { Request, Response } from "express";
import Joi from "joi";
import RoomSvc from "../services/room.service";

export default class RoomCtrl {
  static async fetchRoomList(req: Request, res: Response) {
    try {
      const roomList = await RoomSvc.fetchRoomList();
      return res.status(201).json({ result: roomList });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
  /**
   * Create a new room
   * Only non-deleted users can create rooms
   */
  static async createRoom(req: Request, res: Response) {
    const userId = req.user.id;
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      note: Joi.string().required(),
      roomSubCategoryId: Joi.string().uuid().required(),
      position: Joi.object().required(),
      metaData: Joi.object().required(),
      keyName: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      console.error("[RoomCtrl] Validation Error:", error.message);
      return res.status(400).json({ message: error.message });
    }

    console.log(
      "[RoomCtrl] Creating room with value:",
      JSON.stringify(value, null, 2),
    );

    try {
      const room = await RoomSvc.createRoom({
        ...value,
        ownerId: userId,
      });
      console.log("[RoomCtrl] Room created successfully:", room.id);
      return res.status(201).json({
        message: "Room created successfully",
        room,
      });
    } catch (error: any) {
      console.error("[RoomCtrl] Creation Failed:", error.message || error);
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get all rooms with pagination
   * Returns both public and private rooms (user must be member of private rooms)
   */
  static async getAllRooms(req: Request, res: Response) {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const subcategoryId = req.query.subcategoryId as string;

    try {
      const result = await RoomSvc.getAllRooms(
        userId,
        page,
        limit,
        subcategoryId,
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Get room by ID
   * User must be a member of the room to view it
   */
  static async getRoomById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const room = await RoomSvc.getRoomById(id, userId);
      if (!room) {
        return res
          .status(404)
          .json({ message: "Room not found or access denied" });
      }
      return res.json({ room });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Update room details
   * Only room owner can update room
   */
  static async updateRoom(req: Request, res: Response) {
    try {
      const { roomId } = req.body;
      const userId = req.user.id;
      const schema = Joi.object({
        roomId: Joi.string().required(),
        name: Joi.string().min(1).max(100).optional(),
        isPrivate: Joi.boolean().optional(),
        note: Joi.string().min(1).max(500).optional(),
        roomSubCategoryId: Joi.string().uuid().optional(),
        position: Joi.object().optional(),
        metaData: Joi.object().optional(),
        keyName: Joi.string().optional(),
      }).min(2); // roomId + at least one other field

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const { roomId: _, ...updateData } = value;
      const room = await RoomSvc.updateRoom(roomId, updateData, userId);
      if (!room) {
        return res
          .status(404)
          .json({ message: "Room not found or access denied" });
      }
      return res.json({
        message: "Room updated successfully",
        room,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Soft delete room
   * Only room owner can delete room
   */
  static async deleteRoom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const success = await RoomSvc.deleteRoom(id, userId);
      if (!success) {
        return res
          .status(404)
          .json({ message: "Room not found or access denied" });
      }
      return res.json({ message: "Room deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Join a room
   * Users can join public rooms or private rooms they're invited to
   */
  static async joinRoom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      const result = await RoomSvc.joinRoom(id, userId);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      return res.json({
        message: "Successfully joined room",
        room: result.room,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /**
   * Leave a room
   * Users can leave rooms they're members of
   */
  static async leaveRoom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const success = await RoomSvc.leaveRoom(id, userId);
      if (!success) {
        return res.status(400).json({ message: "Failed to leave room" });
      }
      return res.json({ message: "Successfully left room" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
  static async getRoomMessages(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      if (!req.params.roomId) {
        return res.status(400).json({ message: "Room ID is required" });
      }
      if (!req.user.id) {
        return res.status(400).json({ message: "Unauthorized User!" });
      }
      const response = await RoomSvc.getRoomMessages(
        req.user.id,
        req.params.roomId,
        page,
        limit,
      );
      return res.json({
        success: true,
        data: response,
        pagination: {
          page,
          limit,
          hasMore: response?.length === limit,
        },
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
