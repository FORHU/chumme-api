import { CircleVisibility } from "@prisma/client";
import ChummeCategoryRepo from "../repositories/chumme-category.repository";
import ChummeCategoryAccessRepo from "../repositories/chumme-category-access.repository";
import CircleAccessSvc from "./circle-access.service";
import { ForbiddenError, NotFoundError } from "../utils/error.util";
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
    visibility?: CircleVisibility;
    ownerId: string;
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
    targetCountries?: string[];
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

    const category = await ChummeCategoryRepo.createCategory({
      ...rest,
      // Only a PRIVATE Circle has a code; a PERSONAL one is grant-only
      keyPassword:
        rest.visibility === "PERSONAL" ? undefined : rest.keyPassword,
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
    return CircleAccessSvc.toViewer(category, data.ownerId, new Set());
  }

  /**
   * Get all chumme categories visible to the user
   */
  static async getAllCategories(
    params: { publicOnly?: boolean; userId?: string } = {},
  ) {
    const categories = await CircleAccessSvc.toViewerList(
      await ChummeCategoryRepo.getAllCategories(params),
      params.userId,
    );
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
    userId?: string,
  ) {
    const found: any = await ChummeCategoryRepo.getCategoryById(id, trait);
    if (!found) {
      throw new Error("Category not found");
    }
    const [category] = await CircleAccessSvc.toViewerList([found], userId);
    // Other users' PERSONAL Circles don't exist for them
    if (category.visibility === "PERSONAL" && !category.hasAccess) {
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
    userId: string,
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
    // A user-created Circle can only be changed by its owner
    if (category.ownerId && category.ownerId !== userId) {
      throw new ForbiddenError("Only the Circle's owner can do that");
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

    const updated = await ChummeCategoryRepo.updateCategory(id, {
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
    const [viewed] = await CircleAccessSvc.toViewerList([updated], userId);
    return viewed;
  }

  /**
   * Delete chumme category
   * Prevents deletion if category has active subcategories
   */
  static async deleteCategory(id: string, userId: string) {
    // Check if category exists
    const category = await ChummeCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }
    if (category.ownerId && category.ownerId !== userId) {
      throw new ForbiddenError("Only the Circle's owner can do that");
    }

    // Check if category has active subcategories
    const hasSubCategories =
      await ChummeCategoryRepo.hasActiveSubCategories(id);
    if (hasSubCategories) {
      throw new Error(
        "Cannot delete category with active subcategories. Please delete all subcategories first.",
      );
    }

    const deleted = await ChummeCategoryRepo.softDeleteCategory(id);
    await ChummeCategoryAccessRepo.deleteAllGrants(id);
    return deleted;
  }

  /**
   * Get all subcategories in a category
   */
  static async getSubCategoriesInCategory(
    categoryId: string,
    userId: string,
    password?: string,
  ) {
    // Verify category exists
    const category = await ChummeCategoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    if (category.visibility !== "PUBLIC") {
      await CircleAccessSvc.assertCategoryAccess(categoryId, userId);
    } else if (category.keyPassword && category.keyPassword !== password) {
      // Legacy: a PUBLIC category created with a password before visibility
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
    userId?: string,
  ) {
    const categories = await CircleAccessSvc.toViewerList(
      (await ChummeCategoryRepo.getSpecializedCategories(
        trait,
        userId,
      )) as any[],
      userId,
    );
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => mapLiveStatus(cat, liveArtists));
  }

  /**
   * Get all entertainment categories
   */
  static async getChummeEntertainment(userId?: string) {
    const categories = await CircleAccessSvc.toViewerList(
      (await ChummeCategoryRepo.getChummeEntertainment(userId)) as any[],
      userId,
    );
    const liveArtists = await getLiveArtists();
    return categories.map((cat) => mapLiveStatus(cat, liveArtists));
  }

  /**
   * Get all communities categories
   */
  static async getChummeCommunities(userId?: string) {
    const categories = await CircleAccessSvc.toViewerList(
      (await ChummeCategoryRepo.getChummeCommunities(userId)) as any[],
      userId,
    );
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
