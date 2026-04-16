import PlaylistRepo from "../repositories/playlist.repository";
import CacheUtil from "../utils/cache.util";
import S3Util from "../utils/s3.util";

export default class PlaylistSvc {
  static async createPlaylist(data: any) {
    const playlist = await PlaylistRepo.create(data);
    await CacheUtil.del("playlists:all");
    if (data.userId) await CacheUtil.del(`playlists:user:${data.userId}`);
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

  static async getAllPlaylists(userId?: string) {
    const cachedKey = userId ? `playlists:user:${userId}` : "playlists:all";
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const playlists: any = await PlaylistRepo.findAll(userId);
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

  static async uploadCover(
    playlistId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
  ) {
    const key = `playlists/${playlistId}/cover-${Date.now()}-${filename}`;
    const coverImageUrl = await S3Util.uploadFileWithKey(
      fileBuffer,
      key,
      mimeType,
    );

    const playlist = await PlaylistRepo.update(playlistId, { coverImageUrl });
    await CacheUtil.del(`playlist:${playlistId}`);
    await CacheUtil.del("playlists:all");

    return { coverImageUrl, playlist };
  }

  static async addTrack(playlistId: string, musicId: string, order: number) {
    const playlist = await PlaylistRepo.findById(playlistId);
    if (!playlist) throw new Error("Playlist not found");

    const existing = await PlaylistRepo.findTrack(playlistId, musicId);
    if (existing) throw new Error("Track already in playlist");

    const track = await PlaylistRepo.addTrack(playlistId, musicId, order);
    await CacheUtil.del(`playlist:${playlistId}`);
    await CacheUtil.del("playlists:all");
    return track;
  }

  static async removeTrack(playlistId: string, musicId: string) {
    const playlist = await PlaylistRepo.findById(playlistId);
    if (!playlist) throw new Error("Playlist not found");

    const existing = await PlaylistRepo.findTrack(playlistId, musicId);
    if (!existing) throw new Error("Track not in playlist");

    await PlaylistRepo.removeTrack(playlistId, musicId);
    await CacheUtil.del(`playlist:${playlistId}`);
    await CacheUtil.del("playlists:all");
  }

  static async reorderTracks(
    playlistId: string,
    trackOrder: { musicId: string; order: number }[],
  ) {
    const playlist = await PlaylistRepo.findById(playlistId);
    if (!playlist) throw new Error("Playlist not found");

    await PlaylistRepo.reorderTracks(playlistId, trackOrder);
    await CacheUtil.del(`playlist:${playlistId}`);
    await CacheUtil.del("playlists:all");
  }
}
