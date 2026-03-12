import { prisma } from "../utils/prisma";
import { UserChatRole } from "@prisma/client";
import { io } from "../app";

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
    if (isAlreadyMember) {
      return prisma.roomUserChat.findUnique({
        where: { userId_chummeSubCategoryId: { userId, chummeSubCategoryId } },
        include: { chummeSubCategory: true },
      });
    }

    return prisma.$transaction(async (tx) => {
      // 2. Create membership
      const membership = await tx.roomUserChat.create({
        data: {
          userId,
          chummeSubCategoryId,
          userChatRole: role,
        },
        include: {
          chummeSubCategory: {
            select: {
              id: true,
              chummeCategoryId: true,
            },
          },
        },
      });

      // 3. Increment SubCategory population
      const updatedSub = await tx.chummeSubCategory.update({
        where: { id: chummeSubCategoryId },
        data: { populationCount: { increment: 1 } },
        select: { id: true, populationCount: true, chummeCategoryId: true },
      });

      // 4. Increment Category population
      const updatedCat = await tx.chummeCategory.update({
        where: { id: updatedSub.chummeCategoryId },
        data: { populationCount: { increment: 1 } },
        select: { id: true, populationCount: true },
      });

      // 5. Broadcast real-time updates
      io.emit("population_updated", {
        subCategoryId: updatedSub.id,
        subCategoryCount: updatedSub.populationCount,
        categoryId: updatedCat.id,
        categoryCount: updatedCat.populationCount,
      });

      return membership;
    });
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
        chummeSubCategory: {
          select: {
            id: true,
            chummeCategoryId: true,
          },
        },
      },
    });

    if (!membership) return;

    await prisma.$transaction(async (tx) => {
      // 1. Delete membership
      await tx.roomUserChat.delete({
        where: {
          userId_chummeSubCategoryId: {
            userId,
            chummeSubCategoryId,
          },
        },
      });

      // 2. Decrement SubCategory population
      const updatedSub = await tx.chummeSubCategory.update({
        where: { id: chummeSubCategoryId },
        data: { populationCount: { decrement: 1 } },
        select: { id: true, populationCount: true, chummeCategoryId: true },
      });

      // 3. Decrement Category population
      const updatedCat = await tx.chummeCategory.update({
        where: { id: updatedSub.chummeCategoryId },
        data: { populationCount: { decrement: 1 } },
        select: { id: true, populationCount: true },
      });

      // 4. Broadcast real-time updates
      io.emit("population_updated", {
        subCategoryId: updatedSub.id,
        subCategoryCount: updatedSub.populationCount,
        categoryId: updatedCat.id,
        categoryCount: updatedCat.populationCount,
      });
    });
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
    // 1. Get all memberships
    const memberships = await prisma.roomUserChat.findMany({
      where: { userId },
      include: {
        chummeSubCategory: true,
      },
    });

    if (memberships.length === 0) return { count: 0 };

    // 2. Delete all memberships and update counts
    return prisma.$transaction(async (tx) => {
      const result = await tx.roomUserChat.deleteMany({
        where: { userId },
      });

      // Update populations for each room left
      for (const membership of memberships) {
        const updatedSub = await tx.chummeSubCategory.update({
          where: { id: membership.chummeSubCategoryId },
          data: { populationCount: { decrement: 1 } },
          select: { id: true, populationCount: true, chummeCategoryId: true },
        });

        const updatedCat = await tx.chummeCategory.update({
          where: { id: updatedSub.chummeCategoryId },
          data: { populationCount: { decrement: 1 } },
          select: { id: true, populationCount: true },
        });

        // Broadcast real-time updates
        io.emit("population_updated", {
          subCategoryId: updatedSub.id,
          subCategoryCount: updatedSub.populationCount,
          categoryId: updatedCat.id,
          categoryCount: updatedCat.populationCount,
        });
      }

      return result;
    });
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
