import RoomSubCategoryRepo from "../repositories/room-subcategory.repository";

export default class RoomSubCategorySvc {
  /**
   * Create a new room subcategory
   * Validates parent category exists and name is unique within category
   */
  static async createSubCategory(
    name: string,
    roomCategoryId: string,
    note?: string
  ) {
    // Verify parent category exists
    const categoryExists =
      await RoomSubCategoryRepo.categoryExists(roomCategoryId);
    if (!categoryExists) {
      throw new Error("Parent category not found");
    }

    // Check if subcategory with same name already exists in this category
    const existingSubCategory = await RoomSubCategoryRepo.findSubCategoryByName(
      name,
      roomCategoryId
    );
    if (existingSubCategory) {
      throw new Error(
        "Subcategory with this name already exists in this category"
      );
    }

    return RoomSubCategoryRepo.createSubCategory(name, roomCategoryId, note);
  }

  /**
   * Get all subcategories
   * Optionally filter by category
   */
  static async getAllSubCategories(categoryId?: string) {
    return RoomSubCategoryRepo.getAllSubCategories(categoryId);
  }

  /**
   * Get subcategory by ID
   */
  static async getSubCategoryById(id: string) {
    const subCategory = await RoomSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }
    return subCategory;
  }

  /**
   * Update subcategory
   * Validates name uniqueness and parent category if changed
   */
  static async updateSubCategory(
    id: string,
    data: {
      name?: string;
      roomCategoryId?: string;
      note?: string;
    }
  ) {
    // Check if subcategory exists
    const subCategory = await RoomSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }

    // If changing category, verify new category exists
    if (data.roomCategoryId) {
      const categoryExists = await RoomSubCategoryRepo.categoryExists(
        data.roomCategoryId
      );
      if (!categoryExists) {
        throw new Error("Parent category not found");
      }
    }

    // If changing name, check for duplicates in the target category
    if (data.name) {
      const targetCategoryId =
        data.roomCategoryId || subCategory.roomCategoryId;
      const existingSubCategory =
        await RoomSubCategoryRepo.findSubCategoryByName(
          data.name,
          targetCategoryId
        );
      if (existingSubCategory && existingSubCategory.id !== id) {
        throw new Error(
          "Subcategory with this name already exists in this category"
        );
      }
    }

    return RoomSubCategoryRepo.updateSubCategory(id, data);
  }

  /**
   * Delete subcategory
   * Prevents deletion if subcategory has active rooms
   */
  static async deleteSubCategory(id: string) {
    // Check if subcategory exists
    const subCategory = await RoomSubCategoryRepo.getSubCategoryById(id);
    if (!subCategory) {
      throw new Error("Subcategory not found");
    }

    // Check if subcategory has active rooms
    const hasRooms = await RoomSubCategoryRepo.hasActiveRooms(id);
    if (hasRooms) {
      throw new Error(
        "Cannot delete subcategory with active rooms. Please delete all rooms first."
      );
    }

    return RoomSubCategoryRepo.softDeleteSubCategory(id);
  }
}
