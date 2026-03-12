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

    // 3. Perform upsert
    const discovery = await prisma.socialUserDiscovery.upsert({
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

    // 4. Update population counts (Entertainment)
    if (
      addedCats.length > 0 ||
      removedCats.length > 0 ||
      addedSubCats.length > 0 ||
      removedSubCats.length > 0
    ) {
      // Lazy load to avoid circular dependency
      const ChummeCategoryRepo = (await import("./chumme-category.repository"))
        .default;

      // Category level
      for (const id of addedCats) {
        await ChummeCategoryRepo.updatePopulation(id, "ENTERTAINMENT", 1);
      }
      for (const id of removedCats) {
        await ChummeCategoryRepo.updatePopulation(id, "ENTERTAINMENT", -1);
      }

      // SubCategory level
      for (const id of addedSubCats) {
        await ChummeCategoryRepo.updateSubCategoryPopulation(
          id,
          "ENTERTAINMENT",
          1,
        );
      }
      for (const id of removedSubCats) {
        await ChummeCategoryRepo.updateSubCategoryPopulation(
          id,
          "ENTERTAINMENT",
          -1,
        );
      }
    }

    return discovery;
  }
}
