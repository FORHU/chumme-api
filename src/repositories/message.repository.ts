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
  static async removeMessage(messageId: string) {
    return prisma.message.delete({ where: { id: messageId } });
  }
}
