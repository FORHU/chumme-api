import { prisma } from "../utils/prisma";
import RoomCategoryRepo from "./room-category.repository";

export default class RoomSubCategoryRepo {
  /**
   * Create a new room subcategory
   */
  static async createSubCategory(data: {
    name: string;
    roomCategoryId: string;
    ownerId: string;
    isAd: boolean;
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
    note?: string;
    keyName?: string | null;
  }) {
    const { keyName, note, ...rest } = data;

    return prisma.roomSubCategory.create({
      data: {
        ...rest,
        keyName: keyName || null,
        note: note || null,
        roomCategoryId: data.roomCategoryId,
      },
      include: {
        roomCategory: {
          include: {
            artists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Get all non-deleted subcategories
   */
  static async getAllSubCategories(categoryId?: string) {
    const targetCategoryId = categoryId;

    return prisma.roomSubCategory.findMany({
      where: {
        deletedAt: null,
        ...(targetCategoryId && { roomCategoryId: targetCategoryId }),
      },
      include: {
        roomCategory: {
          include: {
            artists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        _count: {
          select: {
            userChatRooms: true,
            roomMessages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get subcategory by ID
   */
  static async getSubCategoryById(id: string) {
    return prisma.roomSubCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        roomCategory: {
          include: {
            artists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        _count: {
          select: {
            userChatRooms: true,
            roomMessages: true,
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
          select: {
            userChatRooms: true,
            roomMessages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
      isAd?: boolean;
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
      note?: string;
      keyName?: string;
    },
  ) {
    const { keyName, note, ...rest } = data;
    return prisma.roomSubCategory.update({
      where: {
        id: id,
      },
      data: {
        ...rest,
        keyName: keyName === undefined ? undefined : keyName || null,
        note: note === undefined ? undefined : note || null,
        updatedAt: new Date(),
      },
      include: {
        roomCategory: {
          include: {
            artists: { select: { id: true, name: true, imageUrl: true } },
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
        id: id,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find subcategory by name within a category
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
   * Verify category exists
   */
  static async categoryExists(categoryId: string) {
    const category = await prisma.roomCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    return !!category;
  }

  /**
   * Check if there are active rooms in a category
   */
  static async hasActiveRooms(categoryId: string) {
    const count = await prisma.roomSubCategory.count({
      where: {
        roomCategoryId: categoryId,
        deletedAt: null,
      },
    });
    return count > 0;
  }
}
