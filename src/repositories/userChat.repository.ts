import { prisma } from "../utils/prisma";

export default class UserChatRepo {
  static async getUserChat(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const chats = await prisma.userChat.findMany({
      where: {
        userId: userId,
      },
      include: {
        roomChat: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const total = await prisma.userChat.count({
      where: { userId },
    });

    return {
      chats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
