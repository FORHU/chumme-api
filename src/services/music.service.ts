import MusicRepo from "../repositories/music.repository";
import FileRepo from "../repositories/file.repository";
import CacheUtil from "../utils/cache.util";
import S3Util from "../utils/s3.util";

interface CreateMusicInput {
  title: string;
  duration?: number;
  bpm?: number;
  hasWordTiming?: boolean;
  release_date: Date;
  musicFileId?: string;
  musicAlbumId?: string;
  musicArtistId?: string;
  isKaraoke?: boolean;
  playlistId?: string;
  order?: number;
}

interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export default class MusicSvc {
  /**
   * Remove audio file extensions from a string
   */
  private static stripAudioExtension(name: string): string {
    return name.replace(/\.(mp3|wav|flac|aac|ogg|m4a)$/i, "");
  }

  /**
   * Create music with optional file upload
   * If file is provided, uploads to S3 and creates File record
   */
  static async createMusic(data: CreateMusicInput, file?: FileUpload) {
    // If file provided, upload to S3 and create File record
    if (file) {
      const fileUrl = await S3Util.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      const strippedName = this.stripAudioExtension(file.originalname);

      const fileRecord = await FileRepo.createFile({
        filename: strippedName,
        fileUrl: fileUrl,
      });

      data.musicFileId = fileRecord.id;

      // Default title to stripped filename if not provided
      if (!data.title) {
        data.title = strippedName;
      }
    }

    // Strip extension from title if present
    if (data.title) {
      data.title = this.stripAudioExtension(data.title);
    }

    if (!data.musicFileId) {
      throw new Error("musicFileId is required");
    }

    const music = await MusicRepo.create(data);

    // Invalidate caches
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

  static async getMusicByTitle(title: string) {
    const music = await MusicRepo.findByTitle(title);
    return music;
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
