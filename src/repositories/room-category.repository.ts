import { prisma } from "../utils/prisma";

export default class RoomCategoryRepo {
  /**
   * Create a new room category
   */
  static async createCategory(data: {
    name: string;
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
    keyName?: string;
  }) {
    const { keyName, note, ...rest } = data;
    return prisma.roomCategory.create({
      data: {
        ...rest,
        keyName: keyName || null,
        note: note || null,
      },
    });
  }

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
    artistId?: string;
    keyName?: string;
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
   * Get all non-deleted categories with subcategory counts
   */
  static async getAllCategories() {
    return prisma.roomCategory.findMany({
      where: { deletedAt: null },
      include: {
        artists: {
          select: { id: true, name: true, imageUrl: true },
        },
        roomSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            position: true,
            colorSet: true,
            sizeSet: true,
            border: true,
            shadow: true,
            opacity: true,
            capacity: true,
            status: true,
            metaData: true,
            tags: true,
            emojiIcon: true,
            isAd: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                userChatRooms: true,
                roomMessages: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAllCategory() {
    return prisma.roomCategory.findMany({
      where: { deletedAt: null },
    });
  }

  /**
   * Get category by ID with subcategories
   */
  static async getCategoryById(id: string) {
    return prisma.roomCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        artists: {
          select: { id: true, name: true, imageUrl: true },
        },
        roomSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            position: true,
            colorSet: true,
            sizeSet: true,
            border: true,
            shadow: true,
            opacity: true,
            capacity: true,
            status: true,
            metaData: true,
            tags: true,
            emojiIcon: true,
            isAd: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                userChatRooms: true,
                roomMessages: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      } as any, // Temporary cast to bypass some Prisma type confusion if any
    });
  }

  /**
   * Update category name
   */
  static async updateCategory(
    id: string,
    data: {
      name?: string;
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
    return prisma.roomCategory.update({
      where: {
        id: id,
      },
      data: {
        ...rest,
        keyName: keyName === undefined ? undefined : keyName || null,
        note: note === undefined ? undefined : note || null,
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
        id: id,
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
   * Get all rooms (subcategories) in a category
   */
  static async getRoomsInCategory(categoryId: string) {
    return prisma.roomSubCategory.findMany({
      where: {
        roomCategoryId: categoryId,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        roomCategory: {
          select: {
            id: true,
            name: true,
          },
          include: {
            artists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
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
   * Bulk delete (soft delete) rooms (subcategories)
   */
  static async bulkDeleteRooms(roomIds: string[]) {
    return prisma.roomSubCategory.updateMany({
      where: {
        id: {
          in: roomIds,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
