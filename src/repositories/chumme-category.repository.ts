import { prisma } from "../utils/prisma";

export default class ChummeCategoryRepo {
  /**
   * Create a new chumme category
   */
  static async createCategory(data: {
    name: string;
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
      aiChatEnabled?: boolean;
      discoveryEnabled?: boolean;
    };
    channelId?: string[];
  }) {
    return prisma.chummeCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd,
        keyPassword: data.keyPassword || null,
        chummeTraits: data.chummeTraits || "ENTERTAINMENT",
        note: data.note || null,
        channelId: data.channelId || [],
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
    channelId?: string[];
  }) {
    return prisma.chummeSubCategory.create({
      data: {
        name: data.name,
        isAd: data.isAd || false,
        keyPassword: data.keyPassword || null,
        note: data.note || null,
        channelId: data.channelId || [],
        chummeCategory: { connect: { id: data.chummeCategoryId } },
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
      },
      include: {
        chummeCategory: {
          include: {
            chummeArtists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                isLive: true,
                activeVideoId: true,
                countries: true,
                subscriberCount: true,
                totalViews: true,
                lastLiveAt: true,
              },
            },
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
          select: {
            id: true,
            name: true,
            imageUrl: true,
            isLive: true,
            activeVideoId: true,
            countries: true,
            subscriberCount: true,
            totalViews: true,
            lastLiveAt: true,
          },
        },
        chummeSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            isAd: true,
            populationCount: true,
            discoveryKeywords: true,
            targetCountries: true,
            channelId: true,
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
                aiChatEnabled: true,
                discoveryEnabled: true,
              },
            },
            chummeTopicCategories: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                note: true,
                isAd: true,
                populationCount: true,
                discoveryKeywords: true,
                targetCountries: true,
                channelId: true,
                chummeVisualDesign: {
                  select: {
                    id: true,
                    colorSet: true,
                    sizeSet: true,
                    position: true,
                    border: true,
                    shadow: true,
                    opacity: true,
                    capacity: true,
                    status: true,
                    tags: true,
                    emojiIcon: true,
                    aiChatEnabled: true,
                    discoveryEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get category by ID with refined trait selection
   */
  static async getCategoryById(
    id: string,
    trait?: "COMMUNITIES" | "ENTERTAINMENT",
  ) {
    const isCommunities = trait === "COMMUNITIES";

    if (trait) {
      return prisma.chummeCategory.findFirst({
        where: { id, deletedAt: null },
        select: this.getSpecializedSelect(isCommunities) as any,
      });
    }

    return prisma.chummeCategory.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        chummeArtists: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            isLive: true,
            activeVideoId: true,
            countries: true,
            subscriberCount: true,
            totalViews: true,
            lastLiveAt: true,
          },
        },
        chummeSubCategories: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            note: true,
            isAd: true,
            populationCount: true,
            discoveryKeywords: true,
            targetCountries: true,
            channelId: true,
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
                aiChatEnabled: true,
                discoveryEnabled: true,
              },
            },
            chummeTopicCategories: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                note: true,
                isAd: true,
                populationCount: true,
                discoveryKeywords: true,
                targetCountries: true,
                channelId: true,
                chummeVisualDesign: {
                  select: {
                    id: true,
                    colorSet: true,
                    sizeSet: true,
                    position: true,
                    border: true,
                    shadow: true,
                    opacity: true,
                    capacity: true,
                    status: true,
                    tags: true,
                    emojiIcon: true,
                    aiChatEnabled: true,
                    discoveryEnabled: true,
                  },
                },
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
        aiChatEnabled?: boolean;
        discoveryEnabled?: boolean;
      };
      channelId?: string[];
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
        channelId: data.channelId,
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
      select: {
        id: true,
        name: true,
        note: true,
        isAd: true,
        populationCount: true,
        chummeTraits: true,
        discoveryKeywords: true,
        targetCountries: true,
        channelId: true,
        createdAt: true,
        updatedAt: true,
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
            chummeArtists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                isLive: true,
                activeVideoId: true,
                countries: true,
                subscriberCount: true,
                totalViews: true,
                lastLiveAt: true,
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
  static async getSpecializedCategories(
    trait: "COMMUNITIES" | "ENTERTAINMENT",
  ) {
    const isCommunities = trait === "COMMUNITIES";

    return prisma.chummeCategory.findMany({
      where: {
        deletedAt: null,
        chummeTraits: trait,
      },
      select: this.getSpecializedSelect(isCommunities) as any,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all categories with ENTERTAINMENT trait
   */
  static async getChummeEntertainment() {
    return this.getSpecializedCategories("ENTERTAINMENT");
  }

  /**
   * Get all categories with COMMUNITIES trait
   */
  static async getChummeCommunities() {
    return this.getSpecializedCategories("COMMUNITIES");
  }

  /**
   * Helper for specialized selection logic
   */
  private static getSpecializedSelect(isCommunities: boolean) {
    return {
      id: true,
      name: true,
      note: true,
      isAd: true,
      chummeTraits: true,
      populationCount: true,
      chummeVisualDesign: {
        select: {
          id: true,
          colorSet: true,
          sizeSet: true,
          position: true,
          border: true,
          shadow: true,
          opacity: true,
          capacity: true,
          status: true,
          tags: true,
          emojiIcon: true,
          aiChatEnabled: true,
          discoveryEnabled: true,
        },
      },
      chummeSubCategories: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          note: true,
          isAd: true,
          populationCount: true,
          discoveryKeywords: true,
          targetCountries: true,
          channelId: true,
          chummeVisualDesign: {
            select: {
              id: true,
              colorSet: true,
              sizeSet: true,
              position: true,
              border: true,
              shadow: true,
              opacity: true,
              capacity: true,
              status: true,
              tags: true,
              emojiIcon: true,
            },
          },
          chummeTopicCategories: !isCommunities
            ? {
                where: { deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  note: true,
                  isAd: true,
                  populationCount: true,
                  discoveryKeywords: true,
                  targetCountries: true,
                  channelId: true,
                  chummeVisualDesign: {
                    select: {
                      id: true,
                      colorSet: true,
                      sizeSet: true,
                      position: true,
                      border: true,
                      shadow: true,
                      opacity: true,
                      capacity: true,
                      status: true,
                      tags: true,
                      emojiIcon: true,
                    },
                  },
                },
              }
            : false,
        },
      },
      discoveryKeywords: true,
      targetCountries: true,
      channelId: true,
      chummeArtists: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isLive: true,
          activeVideoId: true,
          countries: true,
          subscriberCount: true,
          totalViews: true,
          lastLiveAt: true,
        },
      },
    };
  }
}
