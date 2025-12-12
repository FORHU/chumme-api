import UserChatRepo from "../repositories/user-chat.repository";

export default class UserChatSvc {
  static async getUserChat(userId: string, page = 1, limit = 10) {
    return await UserChatRepo.getUserChat(userId, page, limit);
  }
  static async createUserChat(userId: string, roomId: string) {
    return await UserChatRepo.createUserChat(userId, roomId);
  }
  static async findUserInRoom(userId: string, roomId: string) {
    return UserChatRepo.findUserInRoom(userId, roomId);
  }
}
