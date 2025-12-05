import { Request, Response } from "express";
import Joi from "joi";
import UserChatSvc from "../services/userChat.service";

export default class UserChatCtrl {
  static async fetchActiveRooms(req: Request, res: Response) {
    try {
      const usersInChat = await UserChatSvc.fetchActiveRooms(req.user.id);
      return res.status(201).json({ result: usersInChat });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getRoomMembers(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        roomId: Joi.string(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const roomMembers = await UserChatSvc.getRoomMembers(value.roomId);
      return res.status(201).json({ result: roomMembers });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async createUserChatRoom(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        name: Joi.string(),
        isPrivate: Joi.boolean(),
        note: Joi.string(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const room = await UserChatSvc.createUserChatRoom(
        req.user.id,
        value.name,
        value.note
      );

      return res.status(201).json({ result: room });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async fetchRoomById(req: Request, res: Response)  {
    try {
      const schema = Joi.object({
        roomId: Joi.string(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const room = await UserChatSvc.fetchRoomById(value.roomId);

      return res.status(201).json({ result: room });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  } 

  static async fetchRoomNameList(req: Request, res: Response) {
    try {
      const roomList = await UserChatSvc.fetchRoomNameList();
      return res.status(201).json({ result: roomList });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async removeUserInRoomChat(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        roomId: Joi.string(),
        memberId: Joi.string(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });
      const usersInChat = await UserChatSvc.removeUserInRoomChat(
        req.user.id,
        value.roomId,
        value.memberId
      );
      return res.status(201).json({ result: usersInChat });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
  static async updateUserChatRoomPrivacy(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        roomId: Joi.string(),
        isPrivate: Joi.boolean(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const usersInChat = await UserChatSvc.updateUserChatRoomPrivacy(
        value.roomId,
        value.isPrivate
      );

      return res.status(201).json({ result: usersInChat });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
  static async deleteRoomChat(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        roomId: Joi.string(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const usersInChat = await UserChatSvc.deleteRoomChat(
        req.user.id,
        value.roomId
      );

      return res.status(201).json({ result: usersInChat });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}
