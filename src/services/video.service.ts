import VideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";
import FeedRepo from "../repositories/feed.repository";
import CacheUtil from "../utils/cache.util";
import S3Util from "../utils/s3.util";

export default class VideoSvc {
  // Helper: Validate video data
  private static async validateVideoData(data: {
    title: string;
    fileId: string;
  }) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Video title is required");
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

  static async saveVideo(data: {
    title: string;
    fileId: string;
    platform: any;
    artistId?: string;
    meta_data?: any;
  }) {
    await this.validateVideoData(data);

    const video = await VideoRepo.createVideo({
      title: data.title.trim(),
      fileId: data.fileId,
      platform: data.platform,
      artistId: data.artistId ?? null,
      meta_data: data.meta_data ?? null,
    });

    // Create feed item for the new video
    await FeedRepo.createVideoFeedItem(video.id);

    // Clear feed cache for all pages (since new content was added)
    await CacheUtil.delByPattern(`feed:page:*`);
    await CacheUtil.delByPattern(`feed:personalized:*`);

    return video;
  }

  static async upsertVideo(data: {
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

    await this.validateVideoData(data);

    const result = await VideoRepo.upsertVideo(
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
      await FeedRepo.createVideoFeedItem(result.video.id);

      // Clear feed cache for all pages (since new content was added)
      await CacheUtil.delByPattern(`feed:page:*`);
      await CacheUtil.delByPattern(`feed:personalized:*`);
    }

    return result; // { video, isUpdate }
  }
}
