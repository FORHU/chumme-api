import ChummeCategoryRepo from "../repositories/chumme-category.repository";
import { getLiveArtists } from "../repositories/chumme-artist.repository";
import { mapLiveStatus } from "../utils/community-mapping.util";

export default class ChummeCategorySvc {
  /**
   * Create a new chumme category
   * Validates that name is unique
   */
  static async createCategory(data: {
    name: string;
    keyPassword?: string;
    isAd: boolean;
    chummeTraits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";

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
    aiChatEnabled?: boolean;
    discoveryEnabled?: boolean;
    channelId?: string[];
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
      aiChatEnabled,
      discoveryEnabled,
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
        aiChatEnabled,
        discoveryEnabled,
      },
    });
  }

  /**
   * Get all chumme categories
   */
  static async getAllCategories(params: { publicOnly?: boolean } = {}) {
    const categories = await ChummeCategoryRepo.getAllCategories(params);
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => {
      const mapped = mapLiveStatus(cat, liveArtists);
      return {
        ...mapped,
        membersCount: mapped.populationCount || 0,
        chummeSubCategories: mapped.chummeSubCategories?.map((sub: any) => ({
          ...sub,
          membersCount: sub.populationCount || 0,
          chummeTopicCategories: sub.chummeTopicCategories?.map(
            (topic: any) => ({
              ...topic,
              membersCount: topic.populationCount || 0,
            }),
          ),
        })),
      };
    });
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
    const liveArtists = await getLiveArtists();
    const mapped = mapLiveStatus(category, liveArtists);
    return {
      ...mapped,
      membersCount: mapped.populationCount || 0,
      chummeSubCategories: mapped.chummeSubCategories?.map((sub: any) => ({
        ...sub,
        membersCount: sub.populationCount || 0,
        chummeTopicCategories: sub.chummeTopicCategories?.map((topic: any) => ({
          ...topic,
          membersCount: topic.populationCount || 0,
        })),
      })),
    };
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
      chummeTraits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";

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
      aiChatEnabled?: boolean;
      discoveryEnabled?: boolean;
      channelId?: string[];
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
      aiChatEnabled,
      discoveryEnabled,
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
        aiChatEnabled,
        discoveryEnabled,
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

    const subCategories =
      await ChummeCategoryRepo.getSubCategoriesInCategory(categoryId);
    const liveArtists = await getLiveArtists();
    return subCategories.map((sub) => {
      const mapped = mapLiveStatus(sub, liveArtists);
      return {
        ...mapped,
        membersCount: mapped.populationCount || 0,
      };
    });
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
  static async getSpecializedCategories(
    trait: "COMMUNITIES" | "ENTERTAINMENT",
  ) {
    const categories = await ChummeCategoryRepo.getSpecializedCategories(trait);
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => mapLiveStatus(cat, liveArtists));
  }

  /**
   * Get all entertainment categories
   */
  static async getChummeEntertainment() {
    const categories = await ChummeCategoryRepo.getChummeEntertainment();
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => mapLiveStatus(cat, liveArtists));
  }

  /**
   * Get all communities categories
   */
  static async getChummeCommunities() {
    const categories = await ChummeCategoryRepo.getChummeCommunities();
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => mapLiveStatus(cat, liveArtists));
  }

  /**
   * Helper to map live status from linked artists to the category
   */
  private static mapLiveStatus(item: any) {
    return mapLiveStatus(item);
  }
}
