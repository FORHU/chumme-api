import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import ChummeSubCategoryRepo from "../repositories/chumme-subcategory.repository";
import { UserChatRole } from "@prisma/client";

export default class RoomUserChatSvc {
  /**
   * Get paginated Room User Chats (rooms user has joined)
   */
  static async getUserChat(userId: string, page = 1, limit = 10) {
    return await RoomUserChatRepo.getUserChat(userId, page, limit);
  }

  /**
   * Join a room subcategory
   */
  static async joinRoom(
    userId: string,
    chummeSubCategoryId: string,
    keyPassword?: string,
    roleInput: string = "MEMBER",
  ) {
    // Verify room exists
    const room =
      await ChummeSubCategoryRepo.getSubCategoryById(chummeSubCategoryId);
    if (!room) throw new Error("Room does not exist");

    // Check keyPassword: if null/empty string, it's public. Otherwise, verify password.
    if (room.keyPassword && room.keyPassword !== keyPassword) {
      throw new Error("Invalid password for this room");
    }

    // Map string role to UserChatRole enum
    let chatRole: UserChatRole = UserChatRole.MEMBER;
    const upperRole = roleInput.toUpperCase();
    if (upperRole === "OWNER") chatRole = UserChatRole.OWNER;
    if (upperRole === "ADMIN") chatRole = UserChatRole.ADMIN;

    return RoomUserChatRepo.joinRoom(userId, chummeSubCategoryId, chatRole);
  }

  /**
   * Leave a room
   */
  static async leaveRoom(userId: string, chummeSubCategoryId: string) {
    return RoomUserChatRepo.leaveRoom(userId, chummeSubCategoryId);
  }

  /**
   * Get members of a room
   * Only room members can view the member list
   */
  static async getRoomMembers(chummeSubCategoryId: string, userIdIdx: string) {
    // Check if user is a member of the room
    const isMember = await RoomUserChatRepo.isMember(
      userIdIdx,
      chummeSubCategoryId,
    );
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to view the member list",
      );
    }

    return RoomUserChatRepo.getRoomMembers(chummeSubCategoryId);
  }

  /**
   * Update a member's role (Admin/Owner action)
   */
  static async updateMemberRole(
    userId: string,
    chummeSubCategoryId: string,
    role: UserChatRole,
  ) {
    return RoomUserChatRepo.updateRole(userId, chummeSubCategoryId, role);
  }

  /**
   * Check if a user is in a room
   */
  static async checkMembership(userId: string, chummeSubCategoryId: string) {
    return RoomUserChatRepo.isMember(userId, chummeSubCategoryId);
  }

  /**
   * Leave all rooms
   */
  static async leaveAllRooms(userId: string) {
    return RoomUserChatRepo.leaveAllRooms(userId);
  }

  /**
   * Get all rooms by user ID
   */
  static async getRoomsByUserId(userId: string) {
    return RoomUserChatRepo.getRoomsByUserId(userId);
  }
}
