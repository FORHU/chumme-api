import { prisma } from "../utils/prisma";

export default class ChummeCategoryAccessRepo {
  /**
   * The visibility fields of a category, or null when it doesn't exist
   */
  static async getCategoryVisibility(categoryId: string) {
    return prisma.chummeCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true, visibility: true, ownerId: true, keyPassword: true },
    });
  }

  /**
   * The visibility fields of the category a room belongs to
   */
  static async getRoomCategoryVisibility(chummeSubCategoryId: string) {
    const room = await prisma.chummeSubCategory.findFirst({
      where: { id: chummeSubCategoryId, deletedAt: null },
      select: {
        chummeCategory: {
          select: { id: true, visibility: true, ownerId: true },
        },
      },
    });
    return room?.chummeCategory ?? null;
  }

  static async hasGrant(categoryId: string, userId: string) {
    const grant = await prisma.chummeCategoryAccess.findUnique({
      where: {
        chummeCategoryId_userId: { chummeCategoryId: categoryId, userId },
      },
      select: { id: true },
    });
    return !!grant;
  }

  /**
   * Which of the given categories the user holds a grant for
   */
  static async getGrantedCategoryIds(userId: string, categoryIds: string[]) {
    if (categoryIds.length === 0) return [];
    const grants = await prisma.chummeCategoryAccess.findMany({
      where: { userId, chummeCategoryId: { in: categoryIds } },
      select: { chummeCategoryId: true },
    });
    return grants.map((g) => g.chummeCategoryId);
  }

  /**
   * Create a grant; a repeat grant is a no-op
   */
  static async createGrant(
    categoryId: string,
    userId: string,
    grantedById?: string,
  ) {
    return prisma.chummeCategoryAccess.upsert({
      where: {
        chummeCategoryId_userId: { chummeCategoryId: categoryId, userId },
      },
      create: { chummeCategoryId: categoryId, userId, grantedById },
      update: {},
    });
  }

  /**
   * Remove a grant and the user's memberships in the category's rooms, so a
   * revoked user can no longer post into rooms they had already joined
   */
  static async deleteGrant(categoryId: string, userId: string) {
    return prisma.$transaction([
      prisma.chummeCategoryAccess.deleteMany({
        where: { chummeCategoryId: categoryId, userId },
      }),
      prisma.roomUserChat.deleteMany({
        where: {
          userId,
          chummeSubCategory: { chummeCategoryId: categoryId },
        },
      }),
    ]);
  }

  static async deleteAllGrants(categoryId: string) {
    return prisma.chummeCategoryAccess.deleteMany({
      where: { chummeCategoryId: categoryId },
    });
  }

  static async getGrantedUsers(categoryId: string) {
    const grants = await prisma.chummeCategoryAccess.findMany({
      where: { chummeCategoryId: categoryId },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: { select: { fileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return grants.map(({ user }) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar?.fileUrl ?? null,
    }));
  }

  static async findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        isDeleted: false,
      },
      select: { id: true },
    });
  }
}
