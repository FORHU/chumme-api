import { prisma } from "../utils/prisma";

export default class ChummeTopicCategoryRepo {
  /**
   * Create a new chumme topic category
   */
  static async createTopicCategory(data: {
    name: string;
    chummeSubCategoryId: string;
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
    channelId?: string[];
  }) {
    return prisma.chummeTopicCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd || false,
        keyPassword: data.keyPassword || null,
        chummeTraits: (data.chummeTraits as any) || "NONE",
        note: data.note || null,
        channelId: data.channelId || [],
        chummeSubCategory: { connect: { id: data.chummeSubCategoryId } },
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
        chummeSubCategory: true,
        chummeVisualDesign: true,
      },
    });
  }

  /**
   * Get all non-deleted topic categories
   */
  static async getAllTopicCategories(
    params: { subCategoryId?: string; publicOnly?: boolean } = {},
  ) {
    return prisma.chummeTopicCategory.findMany({
      where: {
        deletedAt: null,
        ...(params.subCategoryId && {
          chummeSubCategoryId: params.subCategoryId,
        }),
        ...(params.publicOnly && {
          OR: [{ keyPassword: null }, { keyPassword: "" }],
        }),
      },
      include: {
        chummeSubCategory: true,
        chummeVisualDesign: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get topic category by ID
   */
  static async getTopicCategoryById(id: string) {
    return prisma.chummeTopicCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        chummeSubCategory: true,
        chummeVisualDesign: true,
      },
    });
  }

  /**
   * Update topic category
   */
  static async updateTopicCategory(
    id: string,
    data: {
      name?: string;
      chummeSubCategoryId?: string;
      isAd?: boolean;
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
      channelId?: string[];
    },
  ) {
    return prisma.chummeTopicCategory.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        isAd: data.isAd,
        keyPassword: data.keyPassword,
        chummeTraits: data.chummeTraits,
        channelId: data.channelId,
        note: data.note === undefined ? undefined : data.note || null,
        chummeSubCategory: data.chummeSubCategoryId
          ? { connect: { id: data.chummeSubCategoryId } }
          : undefined,
        chummeVisualDesign: data.chummeVisualDesign
          ? {
              upsert: {
                create: {
                  ...data.chummeVisualDesign,
                  name: `${data.name || "TopicCategory"} Design`,
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
        chummeSubCategory: true,
        chummeVisualDesign: true,
      },
    });
  }

  /**
   * Soft delete topic category
   */
  static async softDeleteTopicCategory(id: string) {
    return prisma.chummeTopicCategory.update({
      where: {
        id: id,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
