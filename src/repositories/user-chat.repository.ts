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
  static async createUserChat(userId: string, roomId: string, role: string) {
    // return await prisma.userChat.upsert({
    //   where: { room_id_user_id: { userId, roomId } },
    //   update: {},
    //   create: { userId, roomId },
    // });

    const userChat = await prisma.userChat.upsert({
      where: { room_id_user_id: { userId, roomId } },
      update: {},
      create: { userId, roomId },
    });

    const existingMember = await prisma.roomMember.findUnique({
      where: {
        room_id_user_id: { userId, roomId },
      },
    });

    if (!existingMember) {
      await prisma.roomMember.create({
        data: {
          roomId,
          userId,
          role: role,
        },
      });
    }

    // 3️⃣ Re-fetch room with members to return up-to-date info
    const roomWithMembers = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: { select: { fileUrl: true } },
              },
            },
          },
        },
        messages: true,
      },
    });

    return { userChat, room: roomWithMembers };
  }

  static async leaveUserChat(userId: string, roomId: string) {
    return prisma.userChat.delete({
      where: {
        room_id_user_id: { roomId, userId },
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
