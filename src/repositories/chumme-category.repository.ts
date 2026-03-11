import { prisma } from "../utils/prisma";

export default class ChummeCategoryRepo {
  /**
   * Create a new chumme category
   */
  static async createCategory(data: {
    name: string;
    isAd: boolean;
    keyPassword?: string;
    chummeTraits?: "COMMUNITIES" | "ENTERTAINMENT";
    note?: string;
    chummeVisualDesign?: {
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
    };
  }) {
    return prisma.chummeCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd,
        keyPassword: data.keyPassword || null,
        chummeTraits: data.chummeTraits || "ENTERTAINMENT",
        note: data.note || null,
        chummeVisualDesign: data.chummeVisualDesign
          ? {
              create: {
                ...data.chummeVisualDesign,
                name: `${data.name} Design`,
              },
            }
          : undefined,
      },
    });
  }

  /**
   * Create a new chumme subcategory (Helper in Category Repo)
   */
  static async createSubCategory(data: {
    name: string;
    chummeCategoryId: string;
    ownerId: string;
    isAd: boolean;
    keyPassword?: string;
    note?: string;
  }) {
    return prisma.chummeSubCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd || false,
        keyPassword: data.keyPassword || null,
        note: data.note || null,
        chummeCategory: { connect: { id: data.chummeCategoryId } },
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Get all non-deleted categories with subcategory counts
   */
  static async getAllCategories(params: { publicOnly?: boolean } = {}) {
    return prisma.chummeCategory.findMany({
      where: {
        deletedAt: null,
        ...(params.publicOnly && {
          OR: [{ keyPassword: null }, { keyPassword: "" }],
        }),
      },
      include: {
        chummeArtists: {
          select: { id: true, name: true, imageUrl: true },
        },
        chummeSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            isAd: true,
            createdAt: true,
            updatedAt: true,
            chummeVisualDesign: {
              select: {
                position: true,
                colorSet: true,
                sizeSet: true,
                border: true,
                shadow: true,
                opacity: true,
                capacity: true,
                status: true,
                tags: true,
                emojiIcon: true,
              },
            },
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

  static async getAllCategory(params: { publicOnly?: boolean } = {}) {
    return prisma.chummeCategory.findMany({
      where: {
        deletedAt: null,
        ...(params.publicOnly && {
          OR: [{ keyPassword: null }, { keyPassword: "" }],
        }),
      },
    });
  }

  /**
   * Get category by ID with subcategories
   */
  static async getCategoryById(id: string) {
    return prisma.chummeCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        chummeArtists: {
          select: { id: true, name: true, imageUrl: true },
        },
        chummeSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            isAd: true,
            createdAt: true,
            updatedAt: true,
            chummeVisualDesign: {
              select: {
                position: true,
                colorSet: true,
                sizeSet: true,
                border: true,
                shadow: true,
                opacity: true,
                capacity: true,
                status: true,
                tags: true,
                emojiIcon: true,
              },
            },
            _count: {
              select: {
                userChatRooms: true,
                roomMessages: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Update category
   */
  static async updateCategory(
    id: string,
    data: {
      name?: string;
      isAd?: boolean;
      keyPassword?: string;
      chummeTraits?: "COMMUNITIES" | "ENTERTAINMENT";
      note?: string;
      chummeVisualDesign?: {
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
      };
    },
  ) {
    return prisma.chummeCategory.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        isAd: data.isAd,
        keyPassword: data.keyPassword,
        chummeTraits: data.chummeTraits,
        note: data.note === undefined ? undefined : data.note || null,
        chummeVisualDesign: data.chummeVisualDesign
          ? {
              upsert: {
                create: {
                  ...data.chummeVisualDesign,
                  name: `${data.name || "Category"} Design`,
                },
                update: {
                  ...data.chummeVisualDesign,
                },
              },
            }
          : undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete category
   */
  static async softDeleteCategory(id: string) {
    return prisma.chummeCategory.update({
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
   * Find category by name
   */
  static async findCategoryByName(name: string) {
    return prisma.chummeCategory.findFirst({
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
    const count = await prisma.chummeSubCategory.count({
      where: {
        chummeCategoryId: categoryId,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  /**
   * Get all subcategories in a category
   */
  static async getSubCategoriesInCategory(categoryId: string) {
    return prisma.chummeSubCategory.findMany({
      where: {
        chummeCategoryId: categoryId,
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
        chummeCategory: {
          select: {
            id: true,
            name: true,
          },
          include: {
            chummeArtists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        chummeVisualDesign: {
          select: {
            position: true,
            colorSet: true,
            sizeSet: true,
            border: true,
            shadow: true,
            opacity: true,
            capacity: true,
            status: true,
            tags: true,
            emojiIcon: true,
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
   * Bulk delete (soft delete) subcategories
   */
  static async bulkDeleteSubCategories(roomIds: string[]) {
    return prisma.chummeSubCategory.updateMany({
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

  /**
   * Get specialized categories based on trait
   * COMMUNITIES: Fetch Category -> SubCategory (2 levels)
   * ENTERTAINMENT: Fetch Category -> SubCategory -> TopicCategory (3 levels)
   */
  static async getSpecializedCategories(trait: "COMMUNITIES" | "ENTERTAINMENT") {


    const isCommunities = trait === "COMMUNITIES";

    return prisma.chummeCategory.findMany({
      where: {
        deletedAt: null,
        chummeTraits: trait,
      },
      select: {
        id: true,
        name: true,
        note: true,
        isAd: true,
        chummeTraits: true,
        chummeVisualDesign: isCommunities ? true : false,
        chummeSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            isAd: true,
            chummeVisualDesign: isCommunities ? true : false,
            // Exclude userChatRooms for SubCategories in ENTERTAINMENT mode
            userChatRooms: isCommunities ? true : false,
            chummeTopicCategories: !isCommunities
              ? {
                  where: { deletedAt: null },
                  select: {
                    id: true,
                    name: true,
                    note: true,
                    isAd: true,
                    chummeVisualDesign: true,
                  },
                }
              : false,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
