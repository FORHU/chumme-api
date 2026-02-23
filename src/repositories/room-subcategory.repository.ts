import { prisma } from "../utils/prisma";
import { generateKeyName } from "../utils/key-name.util";

export default class RoomSubCategoryRepo {
  /**
   * Create a new room subcategory
   */
  static async createSubCategory(data: {
    name: string;
    roomCategoryId: string;
    ownerId: string;
    metaData: any;
    // position: any;
    // size: string;
    color: string;
    isAd: boolean;
    membersCount: number;
    size: string;
    imageUrl?: string;
    note?: string;
    artistId?: string;
  }) {
    return prisma.roomSubCategory.create({
      data: {
        ...data,
        position: {}, // Rely on frontend physics
        size: "medium", // Default placeholder
        keyName: `${generateKeyName(data.name)}_${Date.now().toString(36)}`,
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
    return prisma.roomSubCategory.findMany({
      where: {
        deletedAt: null,
        ...(categoryId && { roomCategoryId: categoryId }),
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
    return prisma.roomSubCategory.findUnique({
      where: {
        id,
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
   * Get subcategories strictly by a parent room category ID
   */
  static async getRoomSubCategoryByRoomCategoryID(categoryId: string) {
    return prisma.roomSubCategory.findMany({
      where: {
        roomCategoryId: categoryId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { rooms: true },
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
        membersCount: "desc",
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
      // position?: any;
      // size?: string;
      color?: string;
      isAd?: boolean;
      membersCount?: number;
      size?: string;
      imageUrl?: string;
      note?: string;
      artistId?: string;
    },
  ) {
    return prisma.roomSubCategory.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...data,
        ...(data.name && {
          keyName: `${generateKeyName(data.name)}_${Date.now().toString(36)}`,
        }),
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
    return prisma.roomSubCategory.update({
      where: {
        id,
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
   * Find subcategory by keyName within a category
   */
  static async findSubCategoryByKeyName(keyName: string, categoryId: string) {
    return prisma.roomSubCategory.findFirst({
      where: {
        keyName,
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
    const category = await prisma.roomCategory.findUnique({
      where: {
        id: categoryId,
        deletedAt: null,
      },
    });
    return !!category;
  }
}
