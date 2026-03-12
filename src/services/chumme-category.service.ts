import ChummeCategoryRepo from "../repositories/chumme-category.repository";

export default class ChummeCategorySvc {
  /**
   * Create a new chumme category
   * Validates that name is unique
   */
  static async createCategory(data: {
    name: string;
    keyPassword?: string;
    isAd: boolean;
    traits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";



    note?: string;
    position?: any;
    colorSet?: any;
    sizeSet?: any;
    border?: any;
    shadow?: any;
    opacity?: number;
    capacity?: number;
    status?: string;
    metaData?: any;
    tags?: string[];
    emojiIcon?: string;
  }) {
    // Check if category with same name already exists (case-insensitive)
    const existingCategory = await ChummeCategoryRepo.findCategoryByName(
      data.name,
    );
    if (existingCategory) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }

    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      metaData,
      tags,
      emojiIcon,
      ...rest
    } = data;

    return ChummeCategoryRepo.createCategory({
      ...rest,
      chummeVisualDesign: {
        position,
        colorSet,
        sizeSet,
        border,
        shadow,
        opacity,
        capacity,
        status,
        metaData,
        tags,
        emojiIcon,
      },
    });
  }

  /**
   * Get all chumme categories
   */
  static async getAllCategories(params: { publicOnly?: boolean } = {}) {
    return ChummeCategoryRepo.getAllCategories(params);
  }


  /**
   * Get chumme category by ID
   */
  static async getCategoryById(
    id: string,
    trait?: "COMMUNITIES" | "ENTERTAINMENT",
  ) {
    const category = await ChummeCategoryRepo.getCategoryById(id, trait);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  }

  /**
   * Update chumme category
   * Validates name uniqueness
   */
  static async updateCategory(
    id: string,
    data: {
      name?: string;
      keyPassword?: string;
      isAd?: boolean;
      traits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";



      note?: string;
      position?: any;
      colorSet?: any;
      sizeSet?: any;
      border?: any;
      shadow?: any;
      opacity?: number;
      capacity?: number;
      status?: string;
      metaData?: any;
      tags?: string[];
      emojiIcon?: string;
    },
  ) {
    // Check if category exists
    const category = await ChummeCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if new name conflicts with existing category
    if (data.name) {
      const existingCategory = await ChummeCategoryRepo.findCategoryByName(
        data.name,
      );
      if (existingCategory && existingCategory.id !== id) {
        throw new Error("Category with this name already exists");
      }
    }

    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      metaData,
      tags,
      emojiIcon,
      ...rest
    } = data;

    return ChummeCategoryRepo.updateCategory(id, {
      ...rest,
      chummeVisualDesign: {
        position,
        colorSet,
        sizeSet,
        border,
        shadow,
        opacity,
        capacity,
        status,
        metaData,
        tags,
        emojiIcon,
      },
    });
  }

  /**
   * Delete chumme category
   * Prevents deletion if category has active subcategories
   */
  static async deleteCategory(id: string) {
    // Check if category exists
    const category = await ChummeCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has active subcategories
    const hasSubCategories =
      await ChummeCategoryRepo.hasActiveSubCategories(id);
    if (hasSubCategories) {
      throw new Error(
        "Cannot delete category with active subcategories. Please delete all subcategories first.",
      );
    }

    return ChummeCategoryRepo.softDeleteCategory(id);
  }

  /**
   * Get all subcategories in a category
   */
  static async getSubCategoriesInCategory(
    categoryId: string,
    password?: string,
  ) {
    // Verify category exists
    const category = await ChummeCategoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check category password if private
    if (category.keyPassword && category.keyPassword !== password) {
      throw new Error("Invalid password for this category");
    }

    return ChummeCategoryRepo.getSubCategoriesInCategory(categoryId);
  }

  /**
   * Bulk delete subcategories in a category
   */
  static async bulkDeleteSubCategories(categoryId: string, roomIds: string[]) {
    // Verify category exists
    const category = await ChummeCategoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify all subcategories belong to this category
    const subCategories =
      await ChummeCategoryRepo.getSubCategoriesInCategory(categoryId);
    const categorySubCategoryIds = subCategories.map((r) => r.id);
    const invalidRoomIds = roomIds.filter(
      (id) => !categorySubCategoryIds.includes(id),
    );

    if (invalidRoomIds.length > 0) {
      throw new Error(
        `Rooms ${invalidRoomIds.join(", ")} do not belong to category ${categoryId}`,
      );
    }

    return ChummeCategoryRepo.bulkDeleteSubCategories(roomIds);
  }

  /**
   * Get specialized categories based on trait
   */
  static async getSpecializedCategories(trait: "COMMUNITIES" | "ENTERTAINMENT") {
    return ChummeCategoryRepo.getSpecializedCategories(trait);
  }

  /**
   * Get all entertainment categories
   */
  static async getChummeEntertainment() {
    return ChummeCategoryRepo.getChummeEntertainment();
  }

  /**
   * Get all communities categories
   */
  static async getChummeCommunities() {
    return ChummeCategoryRepo.getChummeCommunities();
  }
}
