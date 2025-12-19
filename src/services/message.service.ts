import MessageRepo from "../repositories/message.repository";
import CacheUtil from "../utils/cache.util";

export default class MessageSvc {
  static async createMessage(roomId: string, userId: string, message: string) {
    await CacheUtil.delByPattern(`messages:user:${userId}:page:*`);
    return MessageRepo.createMessage(roomId, userId, message);
  }
  static async removeMessage(messageId: string) {
    return MessageRepo.removeMessage(messageId);
  }
}
