import { Request, Response } from "express";
import Joi from "joi";
import RoomMemberSvc from "../services/roomMember.service";

export default class RoomMemberCtrl {
  /**
   * Get room members
   * Only room members can view member list
   */
  static async getRoomMembers(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ id });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const members = await RoomMemberSvc.getRoomMembers(id, userId);
      if (!members) {
        return res
          .status(404)
          .json({ message: "Room not found or access denied" });
      }
      return res.json({ members });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}
