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
    membersCount: number;
    color: string;
    size: string;
    position: any;
    isAd: boolean;
    metaData: any;
    imageUrl?: string;
    note?: string;
    keyName?: string;
  }) {
    return prisma.roomCategory.create({
      data: {
        ...data,
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
    const realCategoryId = await RoomCategoryRepo.resolveCategoryShortcut(
      data.roomCategoryId,
    );

    // 1. Destructure to separate the fields and handle potential undefineds
    const { keyName, imageUrl, note, artistId, ...rest } = data;

    return prisma.roomSubCategory.create({
      data: {
        ...rest,
        // 2. Explicitly convert undefined to null for Prisma
        keyName: keyName ?? "",
        imageUrl: imageUrl ?? "",
        note: note ?? "",
        artistId: artistId ?? "",
        // 3. Ensure the ID is correctly mapped
        roomCategoryId: realCategoryId || data.roomCategoryId,
      },
      include: {
        roomCategory: { select: { id: true, name: true } },
        artist: { select: { id: true, name: true, imageUrl: true } },
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
            note: true,
            color: true,
            position: true,
            metaData: true,
            size: true,
            isAd: true,
            membersCount: true,
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
                note: true,
                position: true,
                metaData: true,
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
        deletedAt: null,
      },
      include: {
        roomSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            color: true,
            position: true,
            metaData: true,
            size: true,
            isAd: true,
            membersCount: true,
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
                note: true,
                position: true,
                metaData: true,
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
      size?: string;
      position?: any;
      isAd?: boolean;
      metaData?: any;
      imageUrl?: string;
      note?: string;
      keyName?: string;
    },
  ) {
    const realId = (await this.resolveCategoryShortcut(id)) || id;
    return prisma.roomCategory.update({
      where: {
        id: realId,
        deletedAt: null,
      },
      data: {
        ...data,
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
    const realId =
      (await this.resolveCategoryShortcut(categoryId)) || categoryId;
    return prisma.room.findMany({
      where: {
        isDeleted: false,
        roomSubCategory: {
          roomCategoryId: realId,
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
