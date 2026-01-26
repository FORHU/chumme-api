import MusicAlbumRepo from "../repositories/music-album.repository";
import CacheUtil from "../utils/cache.util";
import { Prisma } from "@prisma/client";

export default class MusicAlbumSvc {
  static async createAlbum(data: any) {
    const album = await MusicAlbumRepo.create(data);
    await CacheUtil.del("music-albums:all");
    if (data.musicArtistId) {
      await CacheUtil.del(`music-albums:artist:${data.musicArtistId}`);
    }
    return album;
  }

  static async getAlbumById(id: string) {
    const cachedKey = `music-album:${id}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const album = await MusicAlbumRepo.findById(id);
    if (!album) throw new Error("Music album not found");

    await CacheUtil.set(cachedKey, album);
    return album;
  }

  static async getAllAlbums(params: {
    artistId?: string;
    genre?: string;
    language?: string;
  }) {
    const cachedKey = params.artistId
      ? `music-albums:artist:${params.artistId}`
      : "music-albums:all";

    // We only cache the simple list for now
    if (!params.genre && !params.language) {
      const cached = await CacheUtil.get(cachedKey);
      if (cached) return cached;
    }

    const albums = await MusicAlbumRepo.findAll(params);

    if (!params.genre && !params.language) {
      await CacheUtil.set(cachedKey, albums);
    }

    return albums;
  }

  static async updateAlbum(id: string, data: any) {
    const album = await MusicAlbumRepo.update(id, data);
    await CacheUtil.del(`music-album:${id}`);
    await CacheUtil.del("music-albums:all");
    if (album.musicArtistId) {
      await CacheUtil.del(`music-albums:artist:${album.musicArtistId}`);
    }
    return album;
  }

  static async deleteAlbum(id: string) {
    const album = await MusicAlbumRepo.delete(id);
    await CacheUtil.del(`music-album:${id}`);
    await CacheUtil.del("music-albums:all");
    if (album.musicArtistId) {
      await CacheUtil.del(`music-albums:artist:${album.musicArtistId}`);
    }
    return album;
  }
}
