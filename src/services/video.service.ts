import VideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";
import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
import S3Util from "../utils/s3.util";

export default class VideoSvc {
  // Helper: Validate video data
  private static async validateVideoData(data: {
    title: string;
  }) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Video title is required");
    }
  }

  static async saveVideo(data: {
    title: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
    externalUrl?: string;
  }) {
    await this.validateVideoData(data);

    const video = await VideoRepo.createVideo({
      title: data.title.trim(),
      platform: data.platform,
      artistId: data.artistId ?? null,
      meta_data: data.meta_data ?? null,
      externalUrl: data.externalUrl,
    });

    // Note: SocialFeedRepo.createVideoFeedItem(video.id) is redundant now 
    // because VideoRepo.createVideo creates a SocialFeedItem directly.

    // Clear feed cache
    await CacheUtil.delByPattern(`feed:page:*`);
    await CacheUtil.delByPattern(`feed:personalized:*`);

    return video;
  }

  static async upsertVideo(data: {
    externalUrl: string;
    title: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
  }) {
    if (!data.externalUrl) {
      throw new Error("externalUrl is required to upsert a video");
    }

    await this.validateVideoData(data);

    const result = await VideoRepo.upsertVideo(
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

    return result; // { video, isUpdate }
  }
}
