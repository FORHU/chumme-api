import PlaylistRepo from "../repositories/playlist.repository";
import CacheUtil from "../utils/cache.util";
import { Prisma } from "@prisma/client";

export default class PlaylistSvc {
  static async createPlaylist(data: any) {
    const playlist = await PlaylistRepo.create(data);
    await CacheUtil.del("playlists:all");
    return playlist;
  }

  static async getPlaylistById(id: string) {
    const cachedKey = `playlist:${id}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const playlist: any = await PlaylistRepo.findById(id);
    if (!playlist) throw new Error("Playlist not found");

    // Flatten tracks to music array and preserve order
    const music = playlist.tracks.map((t: any) => ({
      ...t.music,
      playlistOrder: t.order,
    }));
    delete playlist.tracks;
    playlist.music = music;

    await CacheUtil.set(cachedKey, playlist);
    return playlist;
  }

  static async getAllPlaylists() {
    const cachedKey = "playlists:all";
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const playlists: any = await PlaylistRepo.findAll();
    const formattedPlaylists = playlists.map((playlist: any) => {
      const music = playlist.tracks.map((t: any) => ({
        ...t.music,
        playlistOrder: t.order,
      }));
      delete playlist.tracks;
      return { ...playlist, music };
    });

    await CacheUtil.set(cachedKey, formattedPlaylists);
    return formattedPlaylists;
  }

  static async updatePlaylist(id: string, data: any) {
    const playlist = await PlaylistRepo.update(id, data);
    await CacheUtil.del(`playlist:${id}`);
    await CacheUtil.del("playlists:all");
    return playlist;
  }

  static async deletePlaylist(id: string) {
    const playlist = await PlaylistRepo.delete(id);
    await CacheUtil.del(`playlist:${id}`);
    await CacheUtil.del("playlists:all");
    return playlist;
  }
}
