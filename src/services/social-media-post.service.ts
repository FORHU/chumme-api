// import SocialVideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";
import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
import SocialMediaPostRepo from "../repositories/social-media-post.repository";

export default class SocialMediaPostSvc {
  // Helper: Validate video data
  private static async validateMediaPost(data: {
    title: string;
  }) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Media title is required");
    }
  }

  static async saveMediaPost(data: {
    title: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
    externalUrl?: string;
  }) {
    await this.validateMediaPost(data);

    const mediaPost = await SocialMediaPostRepo.createMediaPost({
      title: data.title.trim(),
      platform: data.platform,
      artistId: data.artistId ?? null,
      meta_data: data.meta_data ?? null,
      externalUrl: data.externalUrl,
    });

    // Note: SocialFeedRepo.createMediaPostFeedItem(mediaPost.id) is redundant now 
    // because SocialMediaPostRepo.createMediaPost creates a SocialFeedItem directly.

    // Clear feed cache
    await CacheUtil.delByPattern(`feed:page:*`);
    await CacheUtil.delByPattern(`feed:personalized:*`);

    return mediaPost;
  }

  static async upsertMediaPost(data: {
    externalUrl: string;
    title: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
  }) {
    if (!data.externalUrl) {
      throw new Error("externalUrl is required to upsert a video");
    }

    await this.validateMediaPost(data);

    const result = await SocialMediaPostRepo.upsertMediaPost(
      { externalUrl: data.externalUrl },
      {
        title: data.title.trim(),
        platform: data.platform,
        externalUrl: data.externalUrl,
        artistId: data.artistId ?? null,
        meta_data: data.meta_data ?? null,
      },
    );

    // Clear feed cache only for new items
    if (!result.isUpdate) {
      await CacheUtil.delByPattern(`feed:page:*`);
      await CacheUtil.delByPattern(`feed:personalized:*`);
    }

    return result; // { mediaPost, isUpdate }
  }
}
