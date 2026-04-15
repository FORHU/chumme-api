import LikedSongRepo from "../repositories/liked-song.repository";
import MusicRepo from "../repositories/music.repository";
import CacheUtil from "../utils/cache.util";
import logger from "../utils/logger";

export default class LikedSongSvc {
  static async toggleLike(
    userId: string,
    musicId: string,
  ): Promise<{ liked: boolean; totalLikes: number }> {
    const music = await MusicRepo.findById(musicId);
    if (!music || music.deletedAt) {
      throw new Error("Music not found");
    }

    const existing = await LikedSongRepo.findByUserAndMusic(userId, musicId);

    if (existing) {
      await LikedSongRepo.delete(userId, musicId);
      logger.info(`[LikedSongSvc] User ${userId} unliked music ${musicId}`);
    } else {
      await LikedSongRepo.create(userId, musicId);
      logger.info(`[LikedSongSvc] User ${userId} liked music ${musicId}`);
    }

    const totalLikes = await LikedSongRepo.countByMusic(musicId);
    await CacheUtil.del(`liked:user:${userId}:music:${musicId}`);

    return { liked: !existing, totalLikes };
  }

  static async getLikedSongs(
    userId: string,
    params: { limit?: number; cursor?: string },
  ) {
    const limit = Math.min(params.limit ?? 20, 50);
    return LikedSongRepo.findAllByUser(userId, { limit, cursor: params.cursor });
  }

  static async isLiked(userId: string, musicId: string): Promise<boolean> {
    const cacheKey = `liked:user:${userId}:music:${musicId}`;
    const cached = await CacheUtil.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    const row = await LikedSongRepo.findByUserAndMusic(userId, musicId);
    const liked = !!row;
    await CacheUtil.set(cacheKey, liked, 60);
    return liked;
  }
}
