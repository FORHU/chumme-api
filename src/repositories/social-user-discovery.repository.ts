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
    // 1. Get existing to identify changes
    const existing = await this.getByUserId(userId);
    const existingCatIds = existing?.chummeCategories.map((c) => c.id) || [];
    const newCatIds = data.categoryIds || [];

    const existingSubCatIds =
      existing?.chummeSubCategories.map((c) => c.id) || [];
    const newSubCatIds = data.subCategoryIds || [];

    // 2. Identify additions and removals
    const addedCats = newCatIds.filter((id) => !existingCatIds.includes(id));
    const removedCats = existingCatIds.filter((id) => !newCatIds.includes(id));

    const addedSubCats = newSubCatIds.filter(
      (id) => !existingSubCatIds.includes(id),
    );
    const removedSubCats = existingSubCatIds.filter(
      (id) => !newSubCatIds.includes(id),
    );

    // 3. Perform upsert and mark onboarding as complete in a transaction
    return prisma.$transaction(async (tx) => {
      // Create or update discovery preferences
      const discovery = await tx.socialUserDiscovery.upsert({
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

      // Mark user onboarding as complete
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });

      return discovery;
    });
  }

  /**
   * Fetch all active categories, subcategories, and topic categories with their discovery keywords
   */
  static async getAllSearchableCategories() {
    const categories = await prisma.chummeCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, discoveryKeywords: true },
    });

    const subCategories = await prisma.chummeSubCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, discoveryKeywords: true, chummeCategoryId: true },
    });

    const topicCategories = await prisma.chummeTopicCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, discoveryKeywords: true, chummeSubCategoryId: true },
    });

    return {
      categories: categories.map(c => ({
        id: c.id,
        discoveryKeywords: c.discoveryKeywords as string[],
      })),
      subCategories: subCategories.map(s => ({
        id: s.id,
        discoveryKeywords: s.discoveryKeywords as string[],
        chummeCategoryId: s.chummeCategoryId,
      })),
      topicCategories: topicCategories.map(t => ({
        id: t.id,
        discoveryKeywords: t.discoveryKeywords as string[],
        chummeSubCategoryId: t.chummeSubCategoryId,
      })),
    };
  }
}
