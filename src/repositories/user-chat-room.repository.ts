import { prisma } from "../utils/prisma";
import { UserChatRole } from "@prisma/client";

export default class UserChatRoomRepo {
  /**
   * Get paginated user chats (rooms user has joined)
   */
  static async getUserChat(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const chats = await prisma.userChatRoom.findMany({
      where: {
        userId,
        roomSubCategory: {
          deletedAt: null,
        },
      },
      include: {
        roomSubCategory: {
          include: {
            roomCategory: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.userChatRoom.count({
      where: {
        userId,
        roomSubCategory: {
          deletedAt: null,
        },
      },
    });

    return {
      chats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Add a user to a room
   */
  static async joinRoom(
    userId: string,
    roomSubCategoryId: string,
    role: UserChatRole = "MEMBER",
  ) {
    return prisma.userChatRoom.upsert({
      where: {
        userId_roomSubCategoryId: {
          userId,
          roomSubCategoryId,
        },
      },
      update: {
        userChatRole: role,
      },
      create: {
        userId,
        roomSubCategoryId,
        userChatRole: role,
      },
    });
  }

  /**
   * Remove a user from a room
   */
  static async leaveRoom(userId: string, roomSubCategoryId: string) {
    return prisma.userChatRoom.delete({
      where: {
        userId_roomSubCategoryId: {
          userId,
          roomSubCategoryId,
        },
      },
    });
  }

  /**
   * Update a user's role in a room
   */
  static async updateRole(
    userId: string,
    roomSubCategoryId: string,
    role: UserChatRole,
  ) {
    return prisma.userChatRoom.update({
      where: {
        userId_roomSubCategoryId: {
          userId,
          roomSubCategoryId,
        },
      },
      data: {
        userChatRole: role,
      },
    });
  }

  /**
   * Get all members of a room
   */
  static async getRoomMembers(roomSubCategoryId: string) {
    return prisma.userChatRoom.findMany({
      where: {
        roomSubCategoryId,
        roomSubCategory: {
          deletedAt: null,
        },
      },
      include: {
        user: {
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
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
  }

  /**
   * Check if a user is a member of a room
   */
  static async isMember(userId: string, roomSubCategoryId: string) {
    const membership = await prisma.userChatRoom.findFirst({
      where: {
        userId,
        roomSubCategoryId,
        roomSubCategory: {
          deletedAt: null,
        },
      },
    });
    return !!membership;
  }

  /**
   * Get a user's membership details for a specific room
   */
  static async getMembership(userId: string, roomSubCategoryId: string) {
    return prisma.userChatRoom.findUnique({
      where: {
        userId_roomSubCategoryId: {
          userId,
          roomSubCategoryId,
        },
      },
    });
  }

  static async leaveAllRooms(userId: string) {
    return prisma.userChatRoom.deleteMany({
      where: { userId },
    });
  }

  static async getRoomsByUserId(userId: string) {
    return prisma.userChatRoom.findMany({
      where: {
        userId,
        roomSubCategory: {
          deletedAt: null,
        },
      },
      select: {
        roomSubCategoryId: true,
        roomSubCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });
  }
}
