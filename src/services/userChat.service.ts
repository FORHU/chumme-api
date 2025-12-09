import UserChatRepo from "../repositories/userChat.repository";

export default class UserChatSvc {
  static async getUserChat(userId: string, page = 1, limit = 10) {
      return await UserChatRepo.getUserChat(userId, page, limit);
  }
}
