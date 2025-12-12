import MessageRepo from "../repositories/message.repository";

export default class MessageSvc {
  static async createMessage(roomId: string, userId: string, message: string) {
       return MessageRepo.createMessage(roomId, userId, message);
  }
  static async removeMessage(messageId: string) {
    return MessageRepo.removeMessage(messageId);
  }
}
