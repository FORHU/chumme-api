// import SocialVideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";
import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
import SocialMediaPostRepo from "../repositories/social-media-post.repository";

export default class SocialMediaPostSvc {
  // Helper: Validate video data
  private static async validateMediaPost(data: {
    title: string;
    fileId: string;
  }) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Media title is required");
    }
    if (!data.fileId) {
      throw new Error("fileId is required");
    }

    // Ensure file exists before creating/upserting a video that references it
    const file = await FileRepo.findFileById(data.fileId);
    if (!file) {
      throw new Error("Referenced file not found");
    }
  }

  static async saveMediaPost(data: {
    title: string;
    fileId: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
  }) {
    await this.validateMediaPost(data);

    const mediaPost = await SocialMediaPostRepo.createMediaPost({
      title: data.title.trim(),
      fileId: data.fileId,
      platform: data.platform,
      artistId: data.artistId ?? null,
      meta_data: data.meta_data ?? null,
    });

    // Create feed item for the new video
    await SocialFeedRepo.createVideoFeedItem(mediaPost.id);

    // Clear feed cache for all pages (since new content was added)
    await CacheUtil.delByPattern(`feed:page:*`);
    await CacheUtil.delByPattern(`feed:personalized:*`);

    return mediaPost;
  }

  static async upsertMediaPost(data: {
    externalUrl: string;
    title: string;
    fileId: string;
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
        fileId: data.fileId,
        platform: data.platform,
        externalUrl: data.externalUrl,
        artistId: data.artistId ?? null,
        meta_data: data.meta_data ?? null,
      },
    );

    // Create feed item only for new videos, not updates
    if (!result.isUpdate) {
      await SocialFeedRepo.createMediaPostFeedItem(result.mediaPost.id);

      // Clear feed cache for all pages (since new content was added)
      await CacheUtil.delByPattern(`feed:page:*`);
      await CacheUtil.delByPattern(`feed:personalized:*`);
    }

    return result; // { video, isUpdate }
  }
}
