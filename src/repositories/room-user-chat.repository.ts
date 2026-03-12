import { prisma } from "../utils/prisma";
import { UserChatRole } from "@prisma/client";

export default class RoomUserChatRepo {
  /**
   * Get paginated Room User Chats (rooms user has joined)
   */
  static async getUserChat(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const chats = await prisma.roomUserChat.findMany({
      where: {
        userId,
        chummeSubCategory: {
          deletedAt: null,
        },
      },
      include: {
        chummeSubCategory: {
          include: {
            chummeCategory: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.roomUserChat.count({
      where: {
        userId,
        chummeSubCategory: {
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
    chummeSubCategoryId: string,
    role: UserChatRole = "MEMBER",
  ) {
    // 1. Check if already a member to avoid double counting
    const isAlreadyMember = await this.isMember(userId, chummeSubCategoryId);

    const membership = await prisma.roomUserChat.upsert({
      where: {
        userId_chummeSubCategoryId: {
          userId,
          chummeSubCategoryId,
        },
      },
      update: {
        userChatRole: role,
      },
      create: {
        userId,
        chummeSubCategoryId,
        userChatRole: role,
      },
      include: {
        chummeSubCategory: true,
      },
    });

    // 2. Update population if newly joined
    if (!isAlreadyMember) {
      const ChummeCategoryRepo = (await import("./chumme-category.repository"))
        .default;
      await ChummeCategoryRepo.updateSubCategoryPopulation(
        chummeSubCategoryId,
        "COMMUNITIES",
        1,
      );
      await ChummeCategoryRepo.updatePopulation(
        membership.chummeSubCategory.chummeCategoryId,
        "COMMUNITIES",
        1,
      );
    }

    return membership;
  }

  /**
   * Remove a user from a room
   */
  static async leaveRoom(userId: string, chummeSubCategoryId: string) {
    const membership = await prisma.roomUserChat.findUnique({
      where: {
        userId_chummeSubCategoryId: {
          userId,
          chummeSubCategoryId,
        },
      },
      include: {
        chummeSubCategory: true,
      },
    });

    if (!membership) return;

    await prisma.roomUserChat.delete({
      where: {
        userId_chummeSubCategoryId: {
          userId,
          chummeSubCategoryId,
        },
      },
    });

    // Update population
    const ChummeCategoryRepo = (await import("./chumme-category.repository"))
      .default;
    await ChummeCategoryRepo.updateSubCategoryPopulation(
      chummeSubCategoryId,
      "COMMUNITIES",
      -1,
    );
    await ChummeCategoryRepo.updatePopulation(
      membership.chummeSubCategory.chummeCategoryId,
      "COMMUNITIES",
      -1,
    );
  }

  /**
   * Update a user's role in a room
   */
  static async updateRole(
    userId: string,
    chummeSubCategoryId: string,
    role: UserChatRole,
  ) {
    return prisma.roomUserChat.update({
      where: {
        userId_chummeSubCategoryId: {
          userId,
          chummeSubCategoryId,
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
  static async getRoomMembers(chummeSubCategoryId: string) {
    return prisma.roomUserChat.findMany({
      where: {
        chummeSubCategoryId,
        chummeSubCategory: {
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
  static async isMember(userId: string, chummeSubCategoryId: string) {
    const membership = await prisma.roomUserChat.findFirst({
      where: {
        userId,
        chummeSubCategoryId,
        chummeSubCategory: {
          deletedAt: null,
        },
      },
    });
    return !!membership;
  }

  /**
   * Get a user's membership details for a specific room
   */
  static async getMembership(userId: string, chummeSubCategoryId: string) {
    return prisma.roomUserChat.findUnique({
      where: {
        userId_chummeSubCategoryId: {
          userId,
          chummeSubCategoryId,
        },
      },
    });
  }

  static async leaveAllRooms(userId: string) {
    // 1. Get all memberships to update populations
    const memberships = await prisma.roomUserChat.findMany({
      where: { userId },
      include: {
        chummeSubCategory: true,
      },
    });

    if (memberships.length === 0) return { count: 0 };

    // 2. Delete all memberships
    const result = await prisma.roomUserChat.deleteMany({
      where: { userId },
    });

    // 3. Update populations (Communities)
    const ChummeCategoryRepo = (await import("./chumme-category.repository"))
      .default;
    for (const membership of memberships) {
      await ChummeCategoryRepo.updateSubCategoryPopulation(
        membership.chummeSubCategoryId,
        "COMMUNITIES",
        -1,
      );
      await ChummeCategoryRepo.updatePopulation(
        membership.chummeSubCategory.chummeCategoryId,
        "COMMUNITIES",
        -1,
      );
    }

    return result;
  }

  static async getRoomsByUserId(userId: string) {
    return prisma.roomUserChat.findMany({
      where: {
        userId,
        chummeSubCategory: {
          deletedAt: null,
        },
      },
      select: {
        chummeSubCategoryId: true,
        chummeSubCategory: {
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
