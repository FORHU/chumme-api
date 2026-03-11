import { prisma } from "../utils/prisma";

export default class SocialUserDiscoveryRepo {
  /**
   * Get discovery preferences by User ID
   */
  static async getByUserId(userId: string) {
    return prisma.socialUserDiscovery.findUnique({
      where: { userId },
      include: {
        chummeCategories: true,
        chummeSubCategories: true,
        chummeTopicCategories: true,
      },
    });
  }

  /**
   * Upsert discovery record and update category mappings
   */
  static async upsertDiscovery(
    userId: string,
    data: {
      categoryIds?: string[];
      subCategoryIds?: string[];
      topicCategoryIds?: string[];
    },
  ) {
    return prisma.socialUserDiscovery.upsert({
      where: { userId },
      update: {
        chummeCategories: data.categoryIds
          ? { set: data.categoryIds.map((id) => ({ id })) }
          : undefined,
        chummeSubCategories: data.subCategoryIds
          ? { set: data.subCategoryIds.map((id) => ({ id })) }
          : undefined,
        chummeTopicCategories: data.topicCategoryIds
          ? { set: data.topicCategoryIds.map((id) => ({ id })) }
          : undefined,
      },
      create: {
        userId,
        chummeCategories: data.categoryIds
          ? { connect: data.categoryIds.map((id) => ({ id })) }
          : undefined,
        chummeSubCategories: data.subCategoryIds
          ? { connect: data.subCategoryIds.map((id) => ({ id })) }
          : undefined,
        chummeTopicCategories: data.topicCategoryIds
          ? { connect: data.topicCategoryIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        chummeCategories: true,
        chummeSubCategories: true,
        chummeTopicCategories: true,
      },
    });
  }
}
