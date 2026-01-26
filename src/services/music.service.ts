import MusicRepo from "../repositories/music.repository";
import CacheUtil from "../utils/cache.util";
import { Prisma } from "@prisma/client";

export default class MusicSvc {
  static async createMusic(data: any) {
    const music = await MusicRepo.create(data);
    if (data.musicAlbumId) {
      await CacheUtil.del(`musics:album:${data.musicAlbumId}`);
    }
    if (data.musicArtistId) {
      await CacheUtil.del(`musics:artist:${data.musicArtistId}`);
    }
    await CacheUtil.del("musics:all");
    return music;
  }

  static async getMusicById(id: string) {
    const cachedKey = `music:${id}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const music = await MusicRepo.findById(id);
    if (!music) throw new Error("Music not found");

    await CacheUtil.set(cachedKey, music);
    return music;
  }

  static async getMusics(params: {
    albumId?: string;
    artistId?: string;
    playlistId?: string;
  }) {
    const cachedKey = `musics:${JSON.stringify(params)}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const musics = await MusicRepo.findAll(params);
    await CacheUtil.set(cachedKey, musics);
    return musics;
  }

  static async updateMusic(id: string, data: any) {
    const music = await MusicRepo.update(id, data);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.del("musics:all");
    if (music.musicArtistId) {
      await CacheUtil.del(`musics:artist:${music.musicArtistId}`);
    }
    return music;
  }

  static async deleteMusic(id: string) {
    const music = await MusicRepo.delete(id);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.del("musics:all");
    return music;
  }
}
