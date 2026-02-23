import RoomCategoryRepo from "../repositories/room-category.repository";

export default class RoomCategorySvc {
  /**
   * Create a new room category
   * Validates that name is unique
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
    // Check if category with same name already exists (case-insensitive)
    const existingCategory = await RoomCategoryRepo.findCategoryByName(
      data.name,
    );
    if (existingCategory) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }

    return RoomCategoryRepo.createCategory(data);
  }

  /**
   * Get all categories
   */
  static async getAllCategories() {
    return RoomCategoryRepo.getAllCategories();
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id: string) {
    const category = await RoomCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  }

  /**
   * Update category
   * Validates name uniqueness
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
    // Check if category exists
    const category = await RoomCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if new name conflicts with existing category
    if (data.name) {
      const existingCategory = await RoomCategoryRepo.findCategoryByName(
        data.name,
      );
      if (existingCategory && existingCategory.id !== id) {
        throw new Error("Category with this name already exists");
      }
    }

    return RoomCategoryRepo.updateCategory(id, data);
  }

  /**
   * Delete category
   * Prevents deletion if category has active subcategories
   */
  static async deleteCategory(id: string) {
    // Check if category exists
    const category = await RoomCategoryRepo.getCategoryById(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has active subcategories
    const hasSubCategories = await RoomCategoryRepo.hasActiveSubCategories(id);
    if (hasSubCategories) {
      throw new Error(
        "Cannot delete category with active subcategories. Please delete all subcategories first.",
      );
    }

    return RoomCategoryRepo.softDeleteCategory(id);
  }

  /**
   * Get all rooms in a category
   */
  static async getRoomsInCategory(categoryId: string) {
    // Verify category exists
    const category = await RoomCategoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return RoomCategoryRepo.getRoomsInCategory(categoryId);
  }

  /**
   * Bulk delete rooms in a category
   */
  static async bulkDeleteRooms(categoryId: string, roomIds: string[]) {
    // Verify category exists
    const category = await RoomCategoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify all rooms belong to this category
    const rooms = await RoomCategoryRepo.getRoomsInCategory(categoryId);
    const categoryRoomIds = rooms.map((r) => r.id);
    const invalidRoomIds = roomIds.filter(
      (id) => !categoryRoomIds.includes(id),
    );

    if (invalidRoomIds.length > 0) {
      throw new Error(
        `Rooms ${invalidRoomIds.join(", ")} do not belong to category ${categoryId}`,
      );
    }

    return RoomCategoryRepo.bulkDeleteRooms(roomIds);
  }
}
