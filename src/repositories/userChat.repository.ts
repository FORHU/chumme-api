import { prisma } from "../utils/prisma";

export default class UserChatRepo {
  static async findRoomChatByUserId(userId: string) {
    return prisma.userChat.findFirst({
      where: { userId: userId },
      select: {
        roomId: true,
        createdAt: true,
        // Room Model
        roomChat: {
          select: {
            name: true,
            isPrivate: true,
            createdAt: true,
            isDeleted: true,
            // Message Model
            messages: {
              select: {
                content: true,
                isSystem: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
            },
            // User Model
            owner: {
              select: {
                name: true,
                username: true,
              },
            },
            // RoomMember Model
            members: {
              select: {
                // User Model
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                joinedAt: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }
  static async createRoomUserChat(
    userId: string,
    name: string,
    isPrivate: boolean
  ) {
    return prisma.room.create({
      data: {
        name: name,
        isPrivate: isPrivate,
        ownerId: userId,
        isDeleted: false,
      },
    });
  }
  static async removeRoomUserChat(
    roomId: string,
    userId: string,
    name: string
  ) {
    return prisma.room.update({
      where: {
        ownerId: userId,
        id: roomId,
      },
      data: {
        isDeleted: true,
      },
    });
  }
  static async updateUserChatRoomPrivacy(
    roomId: string,
    userId: string,
    isPrivate: boolean
  ) {
    return prisma.room.update({
      where: {
        ownerId: userId,
        id: roomId,
      },
      data: {
        isPrivate: isPrivate,
      },
    });
  }
}
