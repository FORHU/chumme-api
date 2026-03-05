import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import RoomSubCategoryRepo from "../repositories/room-subcategory.repository";
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
    roomSubCategoryId: string,
    roleInput: string = "MEMBER",
  ) {
    // Verify room exists
    const room =
      await RoomSubCategoryRepo.getSubCategoryById(roomSubCategoryId);
    if (!room) throw new Error("Room does not exist");

    // Map string role to UserChatRole enum
    let chatRole: UserChatRole = UserChatRole.MEMBER;
    const upperRole = roleInput.toUpperCase();
    if (upperRole === "OWNER") chatRole = UserChatRole.OWNER;
    if (upperRole === "ADMIN") chatRole = UserChatRole.ADMIN;

    return RoomUserChatRepo.joinRoom(userId, roomSubCategoryId, chatRole);
  }

  /**
   * Leave a room
   */
  static async leaveRoom(userId: string, roomSubCategoryId: string) {
    return RoomUserChatRepo.leaveRoom(userId, roomSubCategoryId);
  }

  /**
   * Get members of a room
   * Only room members can view the member list
   */
  static async getRoomMembers(roomSubCategoryId: string, userIdIdx: string) {
    // Check if user is a member of the room
    const isMember = await RoomUserChatRepo.isMember(
      userIdIdx,
      roomSubCategoryId,
    );
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to view the member list",
      );
    }

    return RoomUserChatRepo.getRoomMembers(roomSubCategoryId);
  }

  /**
   * Update a member's role (Admin/Owner action)
   */
  static async updateMemberRole(
    userId: string,
    roomSubCategoryId: string,
    role: UserChatRole,
  ) {
    return RoomUserChatRepo.updateRole(userId, roomSubCategoryId, role);
  }

  /**
   * Check if a user is in a room
   */
  static async checkMembership(userId: string, roomSubCategoryId: string) {
    return RoomUserChatRepo.isMember(userId, roomSubCategoryId);
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
