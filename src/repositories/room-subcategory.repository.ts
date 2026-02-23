import { prisma } from "../utils/prisma";

export default class RoomSubCategoryRepo {
  /**
   * Resolve shortcut IDs (like 'usa', 'global') to their real UUIDs
   */
  static async resolveShortcutToId(categoryId: string): Promise<string | null> {
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

    if (specialMappings[categoryId]) {
      const categoryName = specialMappings[categoryId];
      const category = await prisma.roomCategory.findFirst({
        where: {
          name: { equals: categoryName, mode: "insensitive" },
          deletedAt: null,
        },
      });
      return category?.id || null;
    }

    return categoryId; // Assume it's already a UUID
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
    const realCategoryId = await this.resolveShortcutToId(data.roomCategoryId);

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
        (await this.resolveShortcutToId(categoryId)) || categoryId;
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
    return prisma.roomSubCategory.update({
      where: {
        id,
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
    const realId = await this.resolveShortcutToId(categoryId);
    const category = await prisma.roomCategory.findUnique({
      where: {
        id: realId || categoryId,
        deletedAt: null,
      },
    });
    return !!category;
  }
}
