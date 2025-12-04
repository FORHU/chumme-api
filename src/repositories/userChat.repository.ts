import { prisma } from "../utils/prisma";

export default class UserChatRepo {
  static async findRoomChat(roomId: string, userId: string) {
    return prisma.room.findFirst({
      where: { id: roomId, ownerId: userId },
    });
  }

  static async findRoomChatById(roomId: string) {
    return prisma.room.findFirst({
      where: { id: roomId },
    });
  }

  static async fetchActiveRooms(userId: string) {
    return prisma.room.findMany({
      where: {
        isDeleted: false,
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            role: true,
            joinedAt: true,
          },
        },
        messages: {
          select: {
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async findRoomChatByUserId(userId: string) {
    return prisma.userChat.findMany({
      where: {
        userId,
        roomChat: {
          isDeleted: false, 
        },
      },
      select: {
        id: true, 
        roomId: true,
        createdAt: true,

        roomChat: {
          select: {
            name: true,
            isPrivate: true,
            createdAt: true,
            isDeleted: true,

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
              orderBy: { createdAt: "desc" },
              // take: 1, 
            },

            owner: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },

            members: {
              select: {
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

  static async getRoomMembers(roomId: string) {
    return prisma.roomMember.findMany({
      where: {
        roomId,
        room: {
          isDeleted: false, 
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        role: true,
        joinedAt: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
  }

  static async createUserChatRoom(
    userId: string,
    name: string,
    isPrivate: boolean
  ) {
    return prisma.room.create({
      data: {
        name,
        isPrivate,
        ownerId: userId,
        isDeleted: false,
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
    });
  }

  static async createUserChat(roomId: string, userId: string) {
    return prisma.userChat.create({
      data: {
        roomId,
        userId,
      },
    });
  }

  static async removeUserInRoomChat(roomId: string, memberId: string) {
    return prisma.roomMember.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: memberId,
        },
      },
    });
  }
  static async deleteRoomChat(roomId: string, userId: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { isDeleted: true },
    });
  }

  static async updateUserChatRoomPrivacy(roomId: string, isPrivate: boolean) {
    return prisma.room.update({
      where: { id: roomId },
      data: { isPrivate },
    });
  }
}
