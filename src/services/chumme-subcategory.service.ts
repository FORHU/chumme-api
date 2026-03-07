import ChummeSubCategoryRepo from "../repositories/chumme-subcategory.repository";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";

export default class ChummeSubCategorySvc {
  /**
   * Create a new chumme subcategory
   * Validates parent category exists and name is unique within category
   */
  static async createSubCategory(data: {
    name: string;
    chummeCategoryId: string;
    ownerId: string;
    isAd: boolean;
    keyPassword?: string;
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
  }) {
    // Verify parent category exists
    const categoryExists = await ChummeSubCategoryRepo.categoryExists(
      data.chummeCategoryId,
    );
    if (!categoryExists) {
      throw new Error("Parent category not found");
    }

    // Check if subcategory with same name already exists in this category (case-insensitive)
    const existingSubCategory =
      await ChummeSubCategoryRepo.findSubCategoryByName(
        data.name,
        data.chummeCategoryId,
      );
    if (existingSubCategory) {
      throw new Error(
        `Subcategory with name "${data.name}" already exists in this category`,
      );
    }

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
      ...rest
    } = data;

    const subCategory = await ChummeSubCategoryRepo.createSubCategory({
      ...rest,
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
    return subCategory;
  }

  /**
   * Get all chumme subcategories
   * Optionally filter by category
   */
  static async getAllSubCategories(
    params: { categoryId?: string; publicOnly?: boolean } = {},
  ) {
    return ChummeSubCategoryRepo.getAllSubCategories(params);
  }

  /**
   * Get chumme subcategory by ID
   */
  static async getSubCategoryById(id: string) {
    const subCategory = await ChummeSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }
    return subCategory;
  }

  /**
   * Get subcategories strictly by a parent chumme category ID
   */
  static async getChummeSubCategoryByChummeCategoryID(
    categoryId: string,
    params: { publicOnly?: boolean } = {},
  ) {
    return ChummeSubCategoryRepo.getChummeSubCategoryByChummeCategoryID(
      categoryId,
      params,
    );
  }

  /**
   * Update chumme subcategory
   * Validates name uniqueness and parent category if changed
   */
  static async updateSubCategory(
    id: string,
    data: {
      name?: string;
      chummeCategoryId?: string;
      isAd?: boolean;
      keyPassword?: string;
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
      ownerId?: string;
      emojiIcon?: string;
      note?: string;
    },
  ) {
    // Check if subcategory exists
    const subCategory = await ChummeSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }

    // If changing category, verify new category exists
    if (data.chummeCategoryId) {
      const categoryExists = await ChummeSubCategoryRepo.categoryExists(
        data.chummeCategoryId,
      );
      if (!categoryExists) {
        throw new Error("Parent category not found");
      }
    }

    // If changing name, check for duplicates in the target category
    if (data.name) {
      const targetCategoryId =
        data.chummeCategoryId || subCategory.chummeCategoryId;
      const existingSubCategory =
        await ChummeSubCategoryRepo.findSubCategoryByName(
          data.name,
          targetCategoryId,
        );
      if (existingSubCategory && existingSubCategory.id !== id) {
        throw new Error(
          "Subcategory with this name already exists in this category",
        );
      }
    }

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
      ...rest
    } = data;

    return ChummeSubCategoryRepo.updateSubCategory(id, {
      ...rest,
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
   * Delete chumme subcategory
   * Prevents deletion if subcategory has active rooms
   */
  static async deleteSubCategory(id: string) {
    // Check if subcategory exists
    const subCategory = await ChummeSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }

    // Check if subcategory has active members
    const hasMembers = await ChummeSubCategoryRepo.hasActiveChatMembers(id);
    if (hasMembers) {
      throw new Error(
        "Cannot delete subcategory with active chat members. Please remove all members first.",
      );
    }

    return ChummeSubCategoryRepo.softDeleteSubCategory(id);
  }

  /**
   * Alias for getSubCategoryById for compatibility
   */
  static async findById(id: string) {
    return this.getSubCategoryById(id);
  }

  /**
   * Helper to map a raw message to the structure expected by the frontend
   * (Migrated from legacy ChummeSvc)
   */
  static async mapMessageWithSignedUrl(msg: any) {
    let voiceNote = undefined;

    if (msg.voiceMessage) {
      const key = (S3Util as any).getKeyFromUrl(msg.voiceMessage.fileUrl);
      let signedUrl = msg.voiceMessage.fileUrl; // Fallback to raw

      if (key) {
        try {
          signedUrl = await S3PresignedUtil.getDownloadUrl(key);
        } catch (err) {
          console.error(
            `[ChummeSubCategorySvc] Error signing URL for key ${key}:`,
            err,
          );
        }
      }

      voiceNote = {
        duration: msg.voiceMessage.metaData?.duration || 0,
        waveform: msg.voiceMessage.metaData?.waveform || [],
        audioUrl: signedUrl,
      };
    }

    return {
      ...msg,
      user: msg.author,
      voiceNote,
    };
  }
}
