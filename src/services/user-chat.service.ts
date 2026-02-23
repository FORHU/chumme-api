import { Role } from "@prisma/client";
import RoomMemberRepo from "../repositories/room-member.repository";
import UserChatRepo from "../repositories/user-chat.repository";
import RoomRepo from "../repositories/room.repository";

export default class UserChatSvc {
  static async getUserChat(userId: string, page = 1, limit = 10) {
    return await UserChatRepo.getUserChat(userId, page, limit);
  }
  static async createUserChat(userId: string, roomId: string, role: string) {
    const room = await RoomRepo.findRoomById(roomId);
    if (!room) throw new Error("Room does not exist");

    const userChat = await UserChatRepo.createUserChat(userId, roomId, role);

    if (userChat) {
      const existingMember = await RoomMemberRepo.findRoomMember(
        userId,
        roomId,
      );
      if (!existingMember) {
        await RoomMemberRepo.createRoomMember(roomId, userId, role);
      }
    }
    return userChat;
  }

  static async findUserInRoom(userId: string, roomId: string) {
    return UserChatRepo.findUserInRoom(userId, roomId);
  }
  static async leaveUserChat(userId: string, roomId: string) {
    return UserChatRepo.leaveUserChat(userId, roomId);
  }
}
