import ChummeTopicCategoryRepo from "../repositories/chumme-topic-category.repository";

export default class ChummeTopicCategorySvc {
  /**
   * Create a new chumme topic category
   */
  static async createTopicCategory(data: {
    name: string;
    chummeSubCategoryId: string;
    isAd: boolean;
    keyPassword?: string;
    traits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";
    note?: string;
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
    channelId?: string[];
  }) {
    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      metaData,
      tags,
      emojiIcon,
      traits,
      ...rest
    } = data;

    return ChummeTopicCategoryRepo.createTopicCategory({
      ...rest,
      chummeTraits: traits,
      chummeVisualDesign: {
        position,
        colorSet,
        sizeSet,
        border,
        shadow,
        opacity,
        capacity,
        status,
        metaData,
        tags,
        emojiIcon,
      },
    });
  }

  /**
   * Get all chumme topic categories
   */
  static async getAllTopicCategories(
    params: {
      subCategoryId?: string;
      publicOnly?: boolean;
    } = {},
  ) {
    return ChummeTopicCategoryRepo.getAllTopicCategories(params);
  }

  /**
   * Get chumme topic category by ID
   */
  static async getTopicCategoryById(id: string) {
    const topicCategory =
      await ChummeTopicCategoryRepo.getTopicCategoryById(id);
    if (!topicCategory) {
      throw new Error("Topic Category not found");
    }
    return topicCategory;
  }

  /**
   * Update chumme topic category
   */
  static async updateTopicCategory(
    id: string,
    data: {
      name?: string;
      chummeSubCategoryId?: string;
      isAd?: boolean;
      keyPassword?: string;
      traits?: "NONE" | "COMMUNITIES" | "ENTERTAINMENT";
      note?: string;
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
      channelId?: string[];
    },
  ) {
    await this.getTopicCategoryById(id);

    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      metaData,
      tags,
      emojiIcon,
      traits,
      ...rest
    } = data;

    return ChummeTopicCategoryRepo.updateTopicCategory(id, {
      ...rest,
      chummeTraits: traits,
      chummeVisualDesign: {
        position,
        colorSet,
        sizeSet,
        border,
        shadow,
        opacity,
        capacity,
        status,
        metaData,
        tags,
        emojiIcon,
      },
    });
  }

  /**
   * Delete chumme topic category
   */
  static async deleteTopicCategory(id: string) {
    await this.getTopicCategoryById(id);
    return ChummeTopicCategoryRepo.softDeleteTopicCategory(id);
  }
}
