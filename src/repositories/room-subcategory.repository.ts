import { prisma } from "../utils/prisma";
import { generateKeyName } from "../utils/key-name.util";

export default class RoomSubCategoryRepo {
  /**
   * Create a new room subcategory
   */
  static async createSubCategory(
    name: string,
    roomCategoryId: string,
    note?: string
  ) {
    return prisma.roomSubCategory.create({
      data: {
        name,
        key_name: generateKeyName(name),
        roomCategoryId,
        note,
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
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
      note?: string;
    }
  ) {
    return prisma.roomSubCategory.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...(data.name && {
          name: data.name,
          key_name: generateKeyName(data.name),
        }),
        ...(data.roomCategoryId && { roomCategoryId: data.roomCategoryId }),
        ...(data.note !== undefined && { note: data.note }),
        updatedAt: new Date(),
      },
      include: {
        roomCategory: {
          select: {
            id: true,
            name: true,
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
   * Find subcategory by name within a category (for duplicate checking)
   */
  static async findSubCategoryByName(name: string, categoryId: string) {
    return prisma.roomSubCategory.findFirst({
      where: {
        name,
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
