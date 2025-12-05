import { prisma } from "../utils/prisma";

export default class UserChatRepo {
  static async findRoomChat(roomId: string, userId: string) {
    return prisma.room.findFirst({
      where: { id: roomId, ownerId: userId },
    });
  }

  static async findRoomMember(roomId: string, userId: string) {
    return prisma.roomMember.findUnique({
      where: {
        room_id_user_id: {
          roomId,
          userId,
        },
      },
    });
  }

  static async fetchRoomName(name: string) {
    return prisma.room.findFirst({
      where: {
        name,
        isDeleted: false,
      },
    });
  }

  static async fetchRoomById(roomId: string) {
    return prisma.room.findFirst({
      where: {
        id: roomId,
        isDeleted: false,
      },
    });
  }

  static async fetchRoomNameList() {
    return prisma.room.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }


  static async getRoomById(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
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
                email: true,
              },
            },
            role: true,
            joinedAt: true,
          },
          orderBy: {
            joinedAt: "asc",
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
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // get the last message
        },
      },
    });

    if (!room) {
      throw new Error("Room not found.");
    }

    return room;
  }

  static async getRoomByName(name: string) {
    return prisma.room.findMany({
      where: {
        isDeleted: false,
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
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

  static async createUserChatRoom(userId: string, name: string, note: string) {
    return prisma.room.create({
      data: {
        name,
        isPrivate: false,
        note,
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

  static async createUserChatAndRoom(
    userId: string,
    name: string,
    note: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Check if a room with the same name already exists
      const existingRoom = await tx.room.findFirst({
        where: { name, isDeleted: false },
      });

      if (existingRoom) {
        throw new Error("Room name already exists!");
      }

      const chatRoom = await tx.room.create({
        data: {
          name,
          isPrivate: false,
          note,
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

      const userChat = await tx.userChat.create({
        data: {
          roomId: chatRoom.id,
          userId,
        },
      });

      const createdRoom = await tx.room.findUnique({
        where: { id: chatRoom.id },
        include: {
          owner: true,
          members: { include: { user: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
        },
      });

      return {
        message: "Room has been created!",
        room: createdRoom,
        userChat,
      };
    });
  }

  static async removeUserInRoomChat(roomId: string, memberId: string) {
    return prisma.roomMember.delete({
      where: {
        room_id_user_id: {
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

  static async joinRoom(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.isDeleted) {
      throw new Error("Room does not exist or has been deleted.");
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: {
        room_id_user_id: { roomId, userId },
      },
    });

    if (existingMember) {
      throw new Error("You are already a member of this room.");
    }

    return prisma.roomMember.create({
      data: {
        roomId,
        userId,
        role: "member",
      },
    });
  }
}
