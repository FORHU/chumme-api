import MessageRepo from "../repositories/message.repository";
import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import CacheUtil from "../utils/cache.util";

export default class MessageSvc {
  /**
   * Create a new message or reply
   */
  static async createMessage(data: {
    roomSubCategoryId: string;
    userId: string;
    content: any;
    voiceMessageId?: string;
    parentMessageId?: string;
  }) {
    // 1. Verify user is a member of the room
    const isMember = await RoomUserChatRepo.isMember(
      data.userId,
      data.roomSubCategoryId,
    );
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to send messages",
      );
    }

    // 2. If it's a reply, verify parent message exists and belongs to the same room
    if (data.parentMessageId) {
      const parent = await MessageRepo.findMessageById(data.parentMessageId);
      if (!parent) throw new Error("Parent message not found");
      if (parent.roomSubCategoryId !== data.roomSubCategoryId) {
        throw new Error("Parent message does not belong to this room");
      }
    }

    // 3. Clear cache
    await CacheUtil.delByPattern(`messages:room:${data.roomSubCategoryId}:*`);

    // 4. Create message
    return MessageRepo.createMessage({
      roomSubCategoryId: data.roomSubCategoryId,
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
    roomSubCategoryId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    parentMessageId?: string,
  ) {
    // 1. Verify membership
    const isMember = await RoomUserChatRepo.isMember(userId, roomSubCategoryId);
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to view messages",
      );
    }

    // 2. Fetch messages
    return MessageRepo.getRoomMessages(
      roomSubCategoryId,
      page,
      limit,
      parentMessageId,
    );
  }

  /**
   * Remove a message
   */
  static async removeMessage(messageId: string, userId: string) {
    const message = await MessageRepo.findMessageById(messageId);
    if (!message) throw new Error("Message not found");

    // Only author or admins (implement admin check if needed) can delete
    if (message.authorId !== userId) {
      throw new Error(
        "Permission denied: You can only delete your own messages",
      );
    }

    return MessageRepo.removeMessage(messageId);
  }
}
