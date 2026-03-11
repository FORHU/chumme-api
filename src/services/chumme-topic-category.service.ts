import ChummeTopicCategoryRepo from "../repositories/chumme-topic-category.repository";

export default class ChummeTopicCategorySvc {
  /**
   * Create a new chumme topic category
   */
  static async createTopicCategory(data: any) {
    return ChummeTopicCategoryRepo.createTopicCategory(data);
  }

  /**
   * Get all chumme topic categories
   */
  static async getAllTopicCategories(params: { subCategoryId?: string; publicOnly?: boolean } = {}) {
    return ChummeTopicCategoryRepo.getAllTopicCategories(params);
  }

  /**
   * Get chumme topic category by ID
   */
  static async getTopicCategoryById(id: string) {
    const topicCategory = await ChummeTopicCategoryRepo.getTopicCategoryById(id);
    if (!topicCategory) {
      throw new Error("Topic Category not found");
    }
    return topicCategory;
  }

  /**
   * Update chumme topic category
   */
  static async updateTopicCategory(id: string, data: any) {
    await this.getTopicCategoryById(id);
    return ChummeTopicCategoryRepo.updateTopicCategory(id, data);
  }

  /**
   * Delete chumme topic category
   */
  static async deleteTopicCategory(id: string) {
    await this.getTopicCategoryById(id);
    return ChummeTopicCategoryRepo.softDeleteTopicCategory(id);
  }
}
