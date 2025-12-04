import { prisma } from "../utils/prisma";

export default class MessageChatRepo {
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
}
