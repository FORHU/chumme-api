import { prisma } from "../utils/prisma";
import RoomCategoryRepo from "./room-category.repository";

export default class RoomSubCategoryRepo {
  /**
   * Resolve shortcut IDs (like 'usa', 'global') to their real UUIDs
   */
  static async resolveSubCategoryId(id: string): Promise<string | null> {
    const subByField = await prisma.roomSubCategory.findFirst({
      where: {
        OR: [{ id: id }, { keyName: id }],
        deletedAt: null,
      },
    });
    return subByField?.id || id;
  }

  /**
   * Create a new room subcategory
   */
  static async createSubCategory(data: {
    name: string;
    roomCategoryId: string;
    ownerId: string;
    metaData: any;
    position: any;
    size: string;
    color: string;
    isAd: boolean;
    membersCount: number;
    imageUrl?: string;
    note?: string;
    artistId?: string;
    keyName?: string;
  }) {
    // Resolve shortcut if needed
    const realCategoryId = await RoomCategoryRepo.resolveCategoryShortcut(
      data.roomCategoryId,
    );

    return prisma.roomSubCategory.create({
      data: {
        ...data,
        roomCategoryId: realCategoryId || data.roomCategoryId,
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        artist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get all non-deleted subcategories
   * Optionally filter by category
   */
  static async getAllSubCategories(categoryId?: string) {
    let targetCategoryId = categoryId;

    if (categoryId) {
      targetCategoryId =
        (await RoomCategoryRepo.resolveCategoryShortcut(categoryId)) ||
        categoryId;
    }

    return prisma.roomSubCategory.findMany({
      where: {
        deletedAt: null,
        ...(targetCategoryId && { roomCategoryId: targetCategoryId }),
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
        artist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get subcategory by ID with parent category and room count
   */
  static async getSubCategoryById(id: string) {
    const subId = (await this.resolveSubCategoryId(id)) || id;
    return prisma.roomSubCategory.findUnique({
      where: {
        id: subId,
        deletedAt: null,
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
        artist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  /**
   * Update subcategory
   */
  static async updateSubCategory(
    id: string,
    data: {
      name?: string;
      roomCategoryId?: string;
      ownerId?: string;
      metaData?: any;
      position?: any;
      size?: string;
      color?: string;
      isAd?: boolean;
      membersCount?: number;
      imageUrl?: string;
      note?: string;
      artistId?: string;
      keyName?: string;
    },
  ) {
    const realId = (await this.resolveSubCategoryId(id)) || id;
    return prisma.roomSubCategory.update({
      where: {
        id: realId,
        deletedAt: null,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        artist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete subcategory
   */
  static async softDeleteSubCategory(id: string) {
    const realId = (await this.resolveSubCategoryId(id)) || id;
    return prisma.roomSubCategory.update({
      where: {
        id: realId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find subcategory by name within a category (case-insensitive)
   */
  static async findSubCategoryByName(name: string, categoryId: string) {
    return prisma.roomSubCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        roomCategoryId: categoryId,
        deletedAt: null,
      },
    });
  }

  /**
   * Check if subcategory has active rooms
   */
  static async hasActiveRooms(subCategoryId: string) {
    const count = await prisma.room.count({
      where: {
        roomSubCategoryId: subCategoryId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  /**
   * Verify category exists
   */
  static async categoryExists(categoryId: string) {
    const realId = await RoomCategoryRepo.resolveCategoryShortcut(categoryId);
    const category = await prisma.roomCategory.findUnique({
      where: {
        id: realId || categoryId,
        deletedAt: null,
      },
    });
    return !!category;
  }
}
