import { prisma } from "../utils/prisma";

export default class MessageRepo {
  static async createMessage(roomId: string, userId: string, message: string) {
    return prisma.message.create({
      data: {
        content: message,

        room: {
          connect: { id: roomId },
        },
        author: {
          connect: { id: userId },
        },
      },
    });
  }

  static async count(where: any) {
    return prisma.message.count({ where });
  }

  static async removeMessage(messageId: string) {
    return prisma.message.delete({ where: { id: messageId } });
  }

  static async getRoomMessages(
    roomId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(limit, 1);
    return prisma.message.findMany({
      where: {
        roomId,
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
        content: true,
        createdAt: true,
        updatedAt: true,
        isSystem: true,

        roomId: true,
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
