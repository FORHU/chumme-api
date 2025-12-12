import { prisma } from "../utils/prisma";

export default class UserChatRepo {
  /**
   * Get paginated user chats
   */
  static async getUserChat(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const chats = await prisma.userChat.findMany({
      where: { userId, deletedAt: null },
      include: { roomChat: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.userChat.count({ where: { userId } });

    return {
      chats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new chat for a user in a room
   */
  static async createUserChat(userId: string, roomId: string) {
    return prisma.userChat.create({
      data: {
        userId,
        roomId,
      },
      include: {
        roomChat: true,
      },
    });
  }

  /**
   * find user
   **/
  static async findUserInRoom(userId: string, roomId: string) {
    return prisma.userChat.findMany({
      where: { userId, roomId },
    });
  }
}
