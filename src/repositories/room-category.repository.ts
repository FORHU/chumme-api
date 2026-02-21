import { prisma } from "../utils/prisma";
import { generateKeyName } from "../utils/key-name.util";

export default class RoomCategoryRepo {
  /**
   * Create a new room category
   */
  static async createCategory(data: {
    name: string;
    membersCount: number;
    color: string;
    // size: string;
    // position: any;
    isAd: boolean;
    metaData: any;
    imageUrl?: string;
    note?: string;
  }) {
    return prisma.roomCategory.create({
      data: {
        ...data,
        position: {}, // Rely on frontend physics
        size: "medium", // Default placeholder
        key_name: generateKeyName(data.name),
      },
    });
  }

  /**
   * Get all non-deleted categories with subcategory counts
   */
  static async getAllCategories() {
    return prisma.roomCategory.findMany({
      where: { deletedAt: null },
      include: {
        roomSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            key_name: true,
            note: true,
            createdAt: true,
            updatedAt: true,
            artist: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            rooms: {
              where: { isDeleted: false },
              select: {
                id: true,
                name: true,
                key_name: true,
                note: true,
                isPrivate: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get category by ID with subcategories
   */
  static async getCategoryById(id: string) {
    return prisma.roomCategory.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        roomSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            key_name: true,
            note: true,
            createdAt: true,
            updatedAt: true,
            artist: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            rooms: {
              where: { isDeleted: false },
              select: {
                id: true,
                name: true,
                key_name: true,
                note: true,
                isPrivate: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Update category name
   */
  static async updateCategory(
    id: string,
    data: {
      name?: string;
      membersCount?: number;
      color?: string;
      // size?: string;
      // position?: any;
      isAd?: boolean;
      metaData?: any;
      imageUrl?: string;
      note?: string;
    },
  ) {
    return prisma.roomCategory.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...data,
        ...(data.name && {
          key_name: generateKeyName(data.name),
        }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete category
   */
  static async softDeleteCategory(id: string) {
    return prisma.roomCategory.update({
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
   * Find category by name (for duplicate checking, case-insensitive)
   */
  static async findCategoryByName(name: string) {
    return prisma.roomCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });
  }

  /**
   * Find category by key_name
   */
  static async findCategoryByKeyName(key_name: string) {
    return prisma.roomCategory.findFirst({
      where: {
        key_name,
        deletedAt: null,
      },
    });
  }

  /**
   * Check if category has active subcategories
   */
  static async hasActiveSubCategories(categoryId: string) {
    const count = await prisma.roomSubCategory.count({
      where: {
        roomCategoryId: categoryId,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  /**
   * Get all rooms in a category (across all subcategories)
   */
  static async getRoomsInCategory(categoryId: string) {
    return prisma.room.findMany({
      where: {
        isDeleted: false,
        roomSubCategory: {
          roomCategoryId: categoryId,
          deletedAt: null,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        roomSubCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Bulk delete (soft delete) rooms
   */
  static async bulkDeleteRooms(roomIds: string[]) {
    return prisma.room.updateMany({
      where: {
        id: {
          in: roomIds,
        },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }
}
