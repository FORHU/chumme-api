import { prisma } from "../utils/prisma";

export default class ChummeSubCategoryRepo {
  /**
   * Create a new chumme subcategory
   */
  static async createSubCategory(data: {
    name: string;
    chummeCategoryId: string;
    ownerId: string;
    isAd: boolean;
    keyPassword?: string;
    chummeTraits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";
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
    return prisma.chummeSubCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd || false,
        keyPassword: data.keyPassword || null,
        chummeTraits: (data.chummeTraits as any) || "NONE",
        note: data.note || null,
        chummeCategory: { connect: { id: data.chummeCategoryId } },
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
        chummeVisualDesign: data.chummeVisualDesign
          ? {
              create: {
                ...data.chummeVisualDesign,
                name: `${data.name} Design`,
              },
            }
          : undefined,
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        chummeVisualDesign: true,
      },
    });
  }

  /**
   * Get all non-deleted subcategories
   */
  static async getAllSubCategories(
    params: { categoryId?: string; publicOnly?: boolean } = {},
  ) {
    return prisma.chummeSubCategory.findMany({
      where: {
        deletedAt: null,
        ...(params.categoryId && { chummeCategoryId: params.categoryId }),
        ...(params.publicOnly && {
          OR: [{ keyPassword: null }, { keyPassword: "" }],
        }),
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        chummeVisualDesign: true,
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
    return prisma.chummeSubCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        chummeVisualDesign: true,
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
   * Get subcategories strictly by a parent chumme category ID
   */
  static async getChummeSubCategoryByChummeCategoryID(
    categoryId: string,
    params: { publicOnly?: boolean } = {},
  ) {
    return prisma.chummeSubCategory.findMany({
      where: {
        chummeCategoryId: categoryId,
        deletedAt: null,
        ...(params.publicOnly && {
          OR: [{ keyPassword: null }, { keyPassword: "" }],
        }),
      },
      include: {
        chummeVisualDesign: true,
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
      chummeCategoryId?: string;
      ownerId?: string;
      isAd?: boolean;
      chummeTraits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";
      keyPassword?: string;
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
    return prisma.chummeSubCategory.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        isAd: data.isAd,
        keyPassword: data.keyPassword,
        chummeTraits: data.chummeTraits,
        note: data.note === undefined ? undefined : data.note || null,
        chummeCategory: data.chummeCategoryId
          ? { connect: { id: data.chummeCategoryId } }
          : undefined,
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
        chummeVisualDesign: data.chummeVisualDesign
          ? {
              upsert: {
                create: {
                  ...data.chummeVisualDesign,
                  name: `${data.name || "SubCategory"} Design`,
                },
                update: {
                  ...data.chummeVisualDesign,
                },
              },
            }
          : undefined,
        updatedAt: new Date(),
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        chummeVisualDesign: true,
      },
    });
  }

  /**
   * Soft delete subcategory
   */
  static async softDeleteSubCategory(id: string) {
    return prisma.chummeSubCategory.update({
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
    return prisma.chummeSubCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        chummeCategoryId: categoryId,
        deletedAt: null,
      },
    });
  }

  /**
   * Verify category exists
   */
  static async categoryExists(categoryId: string) {
    const category = await prisma.chummeCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    return !!category;
  }

  /**
   * Check if there are active chat members in a subcategory
   */
  static async hasActiveChatMembers(subCategoryId: string) {
    const count = await prisma.roomUserChat.count({
      where: {
        chummeSubCategoryId: subCategoryId,
      },
    });
    return count > 0;
  }
}
