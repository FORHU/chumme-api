import RoomMessageRepo from "../repositories/room-message.repository";
import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import CacheUtil from "../utils/cache.util";

export default class RoomMessageSvc {
  /**
   * Create a new message or reply
   */
  static async createMessage(data: {
    chummeSubCategoryId: string;
    userId: string;
    content: any;
    voiceMessageId?: string;
    parentMessageId?: string;
  }) {
    // 1. Verify user is a member of the room
    const isMember = await RoomUserChatRepo.isMember(
      data.userId,
      data.chummeSubCategoryId,
    );
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to send messages",
      );
    }

    // 2. If it's a reply, verify parent message exists and belongs to the same room
    if (data.parentMessageId) {
      const parent = await RoomMessageRepo.findMessageById(
        data.parentMessageId,
      );
      if (!parent) throw new Error("Parent message not found");
      if (parent.chummeSubCategoryId !== data.chummeSubCategoryId) {
        throw new Error("Parent message does not belong to this room");
      }
    }

    // 3. Clear cache
    await CacheUtil.delByPattern(`messages:room:${data.chummeSubCategoryId}:*`);

    // 4. Create message
    return RoomMessageRepo.createMessage({
      chummeSubCategoryId: data.chummeSubCategoryId,
      authorId: data.userId,
      content: data.content,
      voiceMessageId: data.voiceMessageId,
      parentMessageId: data.parentMessageId,
    });
  }

  /**
   * Get messages for a room (top-level or threaded)
   */
  static async getRoomMessages(
    chummeSubCategoryId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    parentMessageId?: string,
  ) {
    // 1. Verify membership
    const isMember = await RoomUserChatRepo.isMember(
      userId,
      chummeSubCategoryId,
    );
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to view messages",
      );
    }

    // 2. Fetch messages
    return RoomMessageRepo.getRoomMessages(
      chummeSubCategoryId,
      page,
      limit,
      parentMessageId,
    );
  }

  /**
   * Remove a message
   */
  static async removeMessage(messageId: string, userId: string) {
    const message = await RoomMessageRepo.findMessageById(messageId);
    if (!message) throw new Error("Message not found");

    // Only author or admins (implement admin check if needed) can delete
    if (message.authorId !== userId) {
      throw new Error(
        "Permission denied: You can only delete your own messages",
      );
    }

    return RoomMessageRepo.removeMessage(messageId);
  }
}
