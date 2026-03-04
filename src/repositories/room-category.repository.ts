import { prisma } from "../utils/prisma";

export default class RoomCategoryRepo {
  /**
   * Resolve category shortcut IDs (like 'usa', 'global') to their real UUIDs
   */
  static async resolveCategoryShortcut(id: string): Promise<string | null> {
    const specialMappings: Record<string, string> = {
      "chumme-main": "Chumme World",
      global: "Global",
      usa: "United States",
      uk: "United Kingdom",
      japan: "Japan",
      south_korea: "South Korea",
      canada: "Canada",
      australia: "Australia",
      brazil: "Brazil",
      indonesia: "Indonesia",
      thailand: "Thailand",
      philippines: "Philippines",
      malaysia: "Malaysia",
      vietnam: "Vietnam",
      mexico: "Mexico",
      taiwan: "Taiwan",
      singapore: "Singapore",
      "global-connect-shortcut": "Global",
      "chumme-lobby-shortcut": "Global",
      "chumme-room-shortcut": "Global",
    };

    if (specialMappings[id]) {
      const categoryName = specialMappings[id];
      const category = await prisma.roomCategory.findFirst({
        where: {
          OR: [
            { name: { equals: categoryName, mode: "insensitive" } },
            { keyName: { equals: categoryName, mode: "insensitive" } },
          ],
          deletedAt: null,
        },
      });
      return category?.id || null;
    }

    // Try finding by ID or KeyName directly if it's not a hardcoded shortcut
    const category = await prisma.roomCategory.findFirst({
      where: {
        OR: [{ id: id }, { keyName: id }],
        deletedAt: null,
      },
    });

    return category?.id || id;
  }

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
    const realCategoryId = await RoomCategoryRepo.resolveCategoryShortcut(
      data.roomCategoryId,
    );

    const { keyName, note, ...rest } = data;

    return prisma.roomSubCategory.create({
      data: {
        ...rest,
        keyName: keyName || null,
        note: note || null,
        roomCategoryId: realCategoryId || data.roomCategoryId,
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
    return prisma.roomCategory.findMany({});
  }

  /**
   * Get category by ID with subcategories
   */
  static async getCategoryById(id: string) {
    const realId = (await this.resolveCategoryShortcut(id)) || id;
    return prisma.roomCategory.findUnique({
      where: {
        id: realId,
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
    const realId = (await this.resolveCategoryShortcut(id)) || id;
    const { keyName, note, ...rest } = data;
    return prisma.roomCategory.update({
      where: {
        id: realId,
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
    const realId = (await this.resolveCategoryShortcut(id)) || id;
    return prisma.roomCategory.update({
      where: {
        id: realId,
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
    const realId =
      (await this.resolveCategoryShortcut(categoryId)) || categoryId;
    return prisma.roomSubCategory.findMany({
      where: {
        roomCategoryId: realId,
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
