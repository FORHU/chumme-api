import MessageRepo from "../repositories/message.repository";
import CacheUtil from "../utils/cache.util";

export default class MessageSvc {
  static async createMessage(
    roomId: string,
    userId: string,
    message: string,
    voiceMessageId?: string,
  ) {
    await CacheUtil.delByPattern(`messages:user:${userId}:page:*`);
    return MessageRepo.createMessage(roomId, userId, message, voiceMessageId);
  }

  static async removeMessage(messageId: string) {
    return MessageRepo.removeMessage(messageId);
  }

  static async getRoomMessages(
    roomId: string,
    userId: string,
    page: number,
    limit: number,
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    // Include userId in cache key
    // const cacheKey = `messages:user:${userId}:page:${page}:limit:${limit}`;
    // const cached = await CacheUtil.get(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    const response = await MessageRepo.getRoomMessages(roomId, page, limit);
    // await CacheUtil.set(cacheKey, response);
    return response;
  }
}
