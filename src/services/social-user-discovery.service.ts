import SocialUserDiscoveryRepo from "../repositories/social-user-discovery.repository";

export default class SocialUserDiscoverySvc {
  /**
   * Get user's discovery data
   */
  static async getDiscovery(userId: string) {
    const discovery = await SocialUserDiscoveryRepo.getByUserId(userId);
    if (!discovery) {
      // Return empty structure instead of error if not found (lazy creation)
      return {
        userId,
        chummeCategories: [],
        chummeSubCategories: [],
        chummeTopicCategories: [],
      };
    }
    return discovery;
  }

  /**
   * Update discovery preferences
   */
  static async updateDiscovery(
    userId: string,
    data: {
      categoryIds?: string[];
      subCategoryIds?: string[];
      topicCategoryIds?: string[];
    },
  ) {
    return SocialUserDiscoveryRepo.upsertDiscovery(userId, data);
  }
}
